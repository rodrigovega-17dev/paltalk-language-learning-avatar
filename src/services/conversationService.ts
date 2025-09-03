import { Audio } from 'expo-av';

import { ConversationContext, Message, ConversationSession, ElevenLabsTTSSettings } from '../types/conversation';
import { conversationStorageService, ConversationStorageService } from './conversationStorageService';
import { elevenLabsService } from './elevenLabsService';

export interface ConversationService {
  startListening(): Promise<void>;
  stopListening(): Promise<string>;
  sendMessageToChatGPT(message: string, context: ConversationContext): Promise<string>;
  speakText(text: string, language: string, ttsSettings: ElevenLabsTTSSettings): Promise<void>;
  pauseConversation(): void;
  resumeConversation(): void;
  // New persistence methods
  startNewConversation(userId: string, language: string, cefrLevel: string): Promise<ConversationSession>;
  saveMessage(conversationId: string, message: Message): Promise<void>;
  loadConversationContext(conversationId: string): Promise<ConversationContext | null>;
  getConversationHistory(userId: string, limit?: number): Promise<ConversationSession[]>;
}

export interface ConversationError {
  type: 'audio' | 'network' | 'api' | 'permission';
  message: string;
  recoverable: boolean;
}

export class ExpoConversationService implements ConversationService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private isPaused = false;
  private chatGPTApiKey: string;
  private speechToTextEndpoint: string;
  private storageService: ConversationStorageService;
  private currentConversation: ConversationSession | null = null;

  constructor(chatGPTApiKey: string, speechToTextEndpoint: string = '', storageService?: ConversationStorageService) {
    this.chatGPTApiKey = chatGPTApiKey;
    this.speechToTextEndpoint = speechToTextEndpoint;
    this.storageService = storageService || conversationStorageService;
    // Don't initialize audio in constructor to allow for proper testing
  }

  private async initializeAudio(useSpeaker: boolean = true): Promise<void> {
    try {
      await Audio.requestPermissionsAsync();
      
      console.log(`ConversationService: Initializing audio with useSpeaker: ${useSpeaker}`);
      
      if (useSpeaker) {
        // Force loudspeaker mode for iOS with multiple configuration attempts
        const loudspeakerConfig = {
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false, // Force loudspeaker on Android
          staysActiveInBackground: false,
        };
        
        // First attempt: Standard loudspeaker configuration
        await Audio.setAudioModeAsync(loudspeakerConfig);
        console.log('ConversationService: Set loudspeaker mode (attempt 1)');
        
        // Second attempt: Try with slightly different settings for iOS compatibility
        try {
          await Audio.setAudioModeAsync({
            ...loudspeakerConfig,
            allowsRecordingIOS: false, // Temporarily disable recording for playback focus
          });
          console.log('ConversationService: Set loudspeaker mode (attempt 2)');
          
          // Re-enable recording
          await Audio.setAudioModeAsync(loudspeakerConfig);
          console.log('ConversationService: Re-enabled recording with loudspeaker');
        } catch (secondaryError) {
          console.log('ConversationService: Secondary loudspeaker attempt failed, using primary config');
        }
      } else {
        // Phone speaker/earpiece mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: true, // Use phone speaker/earpiece
          staysActiveInBackground: false,
        });
        console.log('ConversationService: Set phone speaker mode');
      }
    } catch (error) {
      throw new Error('Failed to initialize audio permissions');
    }
  }

  async startListening(): Promise<void> {
    if (this.isRecording || this.isPaused) {
      throw new Error('Already recording or conversation is paused');
    }

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio permission not granted');
      }

      await this.initializeAudio(true);

      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await this.recording.startAsync();
      this.isRecording = true;
    } catch (error) {
      if (error instanceof Error && error.message === 'Audio permission not granted') {
        throw error;
      }
      const conversationError: ConversationError = {
        type: 'audio',
        message: `Failed to start recording: ${error}`,
        recoverable: true
      };
      throw conversationError;
    }
  }

  async stopListening(): Promise<string> {
    if (!this.isRecording || !this.recording) {
      throw new Error('Not currently recording');
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.isRecording = false;
      this.recording = null;

      if (!uri) {
        throw new Error('No audio recorded');
      }

      // Convert audio to text using speech-to-text service
      const transcription = await this.transcribeAudio(uri);
      return transcription;
    } catch (error) {
      const conversationError: ConversationError = {
        type: 'audio',
        message: `Failed to stop recording: ${error}`,
        recoverable: true
      };
      throw conversationError;
    }
  }

  private async transcribeAudio(audioUri: string): Promise<string> {
    try {
      console.log('Transcribing audio with OpenAI Whisper...');

      // Use OpenAI Whisper API for speech-to-text
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.chatGPTApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        console.log('Whisper API error:', response.status);
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const result = await response.json();
      const transcription = result.text || '';
      console.log('Whisper transcription result:', transcription);
      return transcription;
    } catch (error) {
      console.log('Transcription error:', error);
      const conversationError: ConversationError = {
        type: 'api',
        message: `Speech-to-text failed: ${error}`,
        recoverable: true
      };
      throw conversationError;
    }
  }

  async sendMessageToChatGPT(message: string, context: ConversationContext): Promise<string> {
    if (this.isPaused) {
      console.log('Conversation was paused, resuming for message processing');
      this.isPaused = false; // Auto-resume for message processing
    }

    try {
      // Save user message if we have an active conversation
      if (this.currentConversation) {
        const userMessage: Message = {
          id: this.generateMessageId(),
          role: 'user',
          content: message,
          timestamp: new Date()
        };
        await this.saveMessage(this.currentConversation.id, userMessage);
      }

      const systemPrompt = this.buildSystemPrompt(context);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...context.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.chatGPTApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`ChatGPT API error: ${response.status}`);
      }

      const result = await response.json();
      const assistantResponse = result.choices[0]?.message?.content || 'I apologize, I could not generate a response.';

      // Save assistant message if we have an active conversation
      if (this.currentConversation) {
        const assistantMessage: Message = {
          id: this.generateMessageId(),
          role: 'assistant',
          content: assistantResponse,
          timestamp: new Date()
        };
        await this.saveMessage(this.currentConversation.id, assistantMessage);
      }

      return assistantResponse;
    } catch (error) {
      const conversationError: ConversationError = {
        type: 'api',
        message: `ChatGPT API failed: ${error}`,
        recoverable: true
      };
      throw conversationError;
    }
  }

  private buildSystemPrompt(context: ConversationContext): string {
    const languageInstructions = {
      english: 'Respond in English',
      spanish: 'Respond in Spanish',
      french: 'Respond in French',
      german: 'Respond in German'
    };

    const cefrInstructions = {
      A1: 'Use very simple vocabulary and short sentences. Focus on basic everyday topics.',
      A2: 'Use simple vocabulary and sentence structures. Discuss familiar topics.',
      B1: 'Use intermediate vocabulary. Discuss a wider range of topics with some complexity.',
      B2: 'Use more advanced vocabulary and complex sentence structures.',
      C1: 'Use sophisticated vocabulary and complex grammar structures.',
      C2: 'Use native-level vocabulary and advanced linguistic structures.'
    };

    return `You are a friendly language learning assistant avatar. ${languageInstructions[context.targetLanguage as keyof typeof languageInstructions] || 'Respond in English'}. 
    
    Adapt your language level to ${context.cefrLevel}: ${cefrInstructions[context.cefrLevel as keyof typeof cefrInstructions]}.
    
    Keep responses conversational and engaging. Gently correct mistakes when appropriate. Ask follow-up questions to encourage continued conversation. Limit responses to 2-3 sentences to maintain natural conversation flow.`;
  }

  async speakText(text: string, language: string, ttsSettings: ElevenLabsTTSSettings): Promise<void> {
    if (this.isPaused) {
      return;
    }

    try {
      const { useSpeaker, voiceId, speed, emotion, stability, similarityBoost } = ttsSettings;
      
      const selectedVoiceId = voiceId || await elevenLabsService.getDefaultVoiceForLanguage(language);
      
      const audioSpeed = speed || 1.0;
      const audioEmotion = emotion || 'neutral';
      const audioStability = stability || 0.6;
      const audioSimilarityBoost = similarityBoost || 0.5;
      
      await elevenLabsService.speakText(
        text, 
        selectedVoiceId, 
        language, 
        useSpeaker, 
        audioSpeed,
        audioEmotion,
        audioStability,
        audioSimilarityBoost
      );
    } catch (error) {
      const conversationError: ConversationError = {
        type: 'audio',
        message: `ElevenLabs TTS failed: ${error}`,
        recoverable: true
      };
      throw conversationError;
    }
  }





  pauseConversation(): void {
    this.isPaused = true;
    // Note: ElevenLabs audio stopping is handled by the service itself

    if (this.isRecording && this.recording) {
      this.recording.stopAndUnloadAsync().catch(() => {
        // Handle error silently for pause operation
      });
      this.isRecording = false;
      this.recording = null;
    }
  }

  resumeConversation(): void {
    this.isPaused = false;
  }

  async startNewConversation(userId: string, language: string, cefrLevel: string): Promise<ConversationSession> {
    const conversation = this.storageService.createNewSession(userId, language, cefrLevel);
    const result = await this.storageService.saveConversation(conversation);

    if (!result.success || !result.data) {
      throw new Error(`Failed to create new conversation: ${result.error}`);
    }

    this.currentConversation = result.data;
    return result.data;
  }

  async saveMessage(conversationId: string, message: Message): Promise<void> {
    try {
      // Get current conversation
      const conversationResult = await this.storageService.getConversationById(conversationId);

      if (!conversationResult.success || !conversationResult.data) {
        throw new Error(`Failed to get conversation: ${conversationResult.error}`);
      }

      const conversation = conversationResult.data;
      const updatedMessages = [...conversation.messages, message];

      // Update conversation with new message
      const updateResult = await this.storageService.updateConversation(conversationId, updatedMessages);

      if (!updateResult.success) {
        throw new Error(`Failed to save message: ${updateResult.error}`);
      }

      // Update current conversation if it matches
      if (this.currentConversation && this.currentConversation.id === conversationId) {
        this.currentConversation.messages = updatedMessages;
        this.currentConversation.updatedAt = new Date();
      }
    } catch (error) {
      const conversationError: ConversationError = {
        type: 'api',
        message: `Failed to save message: ${error}`,
        recoverable: true
      };
      throw conversationError;
    }
  }

  async loadConversationContext(conversationId: string): Promise<ConversationContext | null> {
    try {
      const result = await this.storageService.getConversationById(conversationId);

      if (!result.success || !result.data) {
        return null;
      }

      const conversation = result.data;
      this.currentConversation = conversation;

      return {
        targetLanguage: conversation.language,
        cefrLevel: conversation.cefrLevel,
        conversationHistory: conversation.messages
      };
    } catch (error) {
      console.warn('Failed to load conversation context:', error);
      return null;
    }
  }

  async getConversationHistory(userId: string, limit: number = 10): Promise<ConversationSession[]> {
    try {
      const result = await this.storageService.getConversationHistory({
        userId,
        limit
      });

      if (!result.success || !result.data) {
        throw new Error(`Failed to get conversation history: ${result.error}`);
      }

      return result.data;
    } catch (error) {
      const conversationError: ConversationError = {
        type: 'api',
        message: `Failed to get conversation history: ${error}`,
        recoverable: true
      };
      throw conversationError;
    }
  }

  // Helper method to get current conversation
  getCurrentConversation(): ConversationSession | null {
    return this.currentConversation;
  }

  // Helper method to generate message ID
  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance - in production, API keys should come from secure storage
export const conversationService = new ExpoConversationService(
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_OPENAI_API_KEY) || 'test-openai-api-key',
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SPEECH_TO_TEXT_ENDPOINT) || ''
);