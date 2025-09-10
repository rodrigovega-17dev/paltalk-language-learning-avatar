import { Audio } from 'expo-av';
import { ConversationContext, Message, ConversationSession, ElevenLabsTTSSettings } from '../types/conversation';
import { conversationStorageService, ConversationStorageService } from './conversationStorageService';
import { enhancedElevenLabsService, ElevenLabsSettings } from './enhancedElevenLabsService';
import { authService } from './authService';

export interface EnhancedConversationService {
  startListening(): Promise<void>;
  stopListening(targetLanguage?: string): Promise<string>;
  sendMessageToChatGPT(message: string, context: ConversationContext): Promise<string>;
  speakText(text: string, language: string, ttsSettings: ElevenLabsTTSSettings): Promise<void>;
  pauseConversation(): void;
  resumeConversation(): void;
  // New persistence methods
  startNewConversation(userId: string, language: string, cefrLevel: string): Promise<ConversationSession>;
  saveMessage(conversationId: string, message: Message): Promise<void>;
  loadConversationContext(conversationId: string): Promise<ConversationContext | null>;
  getConversationHistory(userId: string, limit?: number): Promise<ConversationSession[]>;
  // Enhanced features
  getConversationInsights(conversationId: string): Promise<ConversationInsights>;
  suggestTopics(cefrLevel: string, language: string): Promise<string[]>;
}

export interface ConversationInsights {
  wordsLearned: string[];
  pronunciationFeedback: PronunciationFeedback[];
  grammarCorrections: GrammarCorrection[];
  progressMetrics: ProgressMetrics;
}

export interface PronunciationFeedback {
  word: string;
  score: number; // 0-100
  suggestions: string[];
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  category: 'grammar' | 'vocabulary' | 'pronunciation';
}

export interface ProgressMetrics {
  conversationDuration: number;
  wordsSpoken: number;
  averageResponseTime: number;
  fluencyScore: number;
}

export interface ConversationError {
  type: 'audio' | 'network' | 'api' | 'permission' | 'elevenlabs';
  message: string;
  recoverable: boolean;
  suggestedActions?: string[];
}

export class EnhancedConversationServiceImpl implements EnhancedConversationService {
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
  }

  private async initializeAudio(useSpeaker: boolean = true): Promise<void> {
    try {
      await Audio.requestPermissionsAsync();
      
      console.log(`EnhancedConversationService: Initializing audio with useSpeaker: ${useSpeaker}`);
      
      if (useSpeaker) {
        const loudspeakerConfig = {
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        };
        
        await Audio.setAudioModeAsync(loudspeakerConfig);
        console.log('EnhancedConversationService: Set loudspeaker mode');
        
        // Additional attempt for iOS compatibility
        try {
          await Audio.setAudioModeAsync({
            ...loudspeakerConfig,
            allowsRecordingIOS: false,
          });
          await Audio.setAudioModeAsync(loudspeakerConfig);
          console.log('EnhancedConversationService: Enhanced loudspeaker configuration applied');
        } catch (secondaryError) {
          console.log('EnhancedConversationService: Secondary loudspeaker attempt failed, using primary config');
        }
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: true,
          staysActiveInBackground: false,
        });
        console.log('EnhancedConversationService: Set phone speaker mode');
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
        const error: ConversationError = {
          type: 'permission',
          message: 'Audio permission not granted',
          recoverable: true,
          suggestedActions: ['Grant microphone permission in settings', 'Restart the app']
        };
        throw error;
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
        recoverable: true,
        suggestedActions: ['Check microphone permissions', 'Restart the app', 'Try again']
      };
      throw conversationError;
    }
  }

  async stopListening(targetLanguage?: string): Promise<string> {
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

      const transcription = await this.transcribeAudio(uri, targetLanguage);
      return transcription;
    } catch (error) {
      const conversationError: ConversationError = {
        type: 'audio',
        message: `Failed to stop recording: ${error}`,
        recoverable: true,
        suggestedActions: ['Try recording again', 'Check microphone permissions']
      };
      throw conversationError;
    }
  }

  private async transcribeAudio(audioUri: string, targetLanguage?: string): Promise<string> {
    try {
      console.log('EnhancedConversationService: Transcribing audio with OpenAI Whisper...');

      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', 'whisper-1');
      
      // Add language parameter if provided for better transcription accuracy
      if (targetLanguage) {
        // Convert language name to ISO code for Whisper API
        const languageCode = this.getLanguageCode(targetLanguage);
        if (languageCode) {
          formData.append('language', languageCode);
          console.log(`EnhancedConversationService: Using language code '${languageCode}' for transcription`);
        }
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.chatGPTApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        console.log('Whisper API error:', response.status);
        const error: ConversationError = {
          type: 'api',
          message: `Speech-to-text failed: HTTP ${response.status}`,
          recoverable: true,
          suggestedActions: ['Check internet connection', 'Try speaking again', 'Verify API key']
        };
        throw error;
      }

      const result = await response.json();
      const transcription = result.text || '';
      console.log('EnhancedConversationService: Whisper transcription result:', transcription);
      return transcription;
    } catch (error) {
      console.log('EnhancedConversationService: Transcription error:', error);
      if (error instanceof Error && 'type' in error) {
        throw error; // Re-throw ConversationError
      }
      const conversationError: ConversationError = {
        type: 'api',
        message: `Speech-to-text failed: ${error}`,
        recoverable: true,
        suggestedActions: ['Check internet connection', 'Try again', 'Speak more clearly']
      };
      throw conversationError;
    }
  }

  private getLanguageCode(language: string): string | null {
    const languageCodes: { [key: string]: string } = {
      'english': 'en',
      'spanish': 'es', 
      'french': 'fr',
      'german': 'de',
      'italian': 'it',
      'portuguese': 'pt',
      'russian': 'ru',
      'chinese': 'zh',
      'japanese': 'ja',
      'korean': 'ko'
    };
    
    return languageCodes[language.toLowerCase()] || null;
  }

  async sendMessageToChatGPT(message: string, context: ConversationContext): Promise<string> {
    if (this.isPaused) {
      console.log('EnhancedConversationService: Conversation was paused, resuming for message processing');
      this.isPaused = false;
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
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error: ConversationError = {
          type: 'api',
          message: `ChatGPT API error: ${response.status}`,
          recoverable: true,
          suggestedActions: ['Check internet connection', 'Verify API key', 'Try again']
        };
        throw error;
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
      if (error instanceof Error && 'type' in error) {
        throw error; // Re-throw ConversationError
      }
      const conversationError: ConversationError = {
        type: 'api',
        message: `ChatGPT API failed: ${error}`,
        recoverable: true,
        suggestedActions: ['Check internet connection', 'Verify API key', 'Try again']
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
    
    Keep responses conversational and engaging. Gently correct mistakes when appropriate. Ask follow-up questions to encourage continued conversation. Limit responses to 2-3 sentences to maintain natural conversation flow.
    
    When you notice errors in the user's language, provide gentle corrections in a supportive way. Focus on helping them improve while maintaining the flow of conversation.`;
  }

  async speakText(text: string, language: string, ttsSettings: ElevenLabsTTSSettings): Promise<void> {
    if (this.isPaused) {
      return;
    }

    try {
      // Convert to ElevenLabs settings format
      const elevenLabsSettings: ElevenLabsSettings = {
        voiceId: ttsSettings.voiceId,
        speed: ttsSettings.speed,
        emotion: ttsSettings.emotion,
        stability: ttsSettings.stability,
        similarityBoost: ttsSettings.similarityBoost,
        useSpeaker: ttsSettings.useSpeaker
      };

      await enhancedElevenLabsService.speakText(text, elevenLabsSettings);
    } catch (error) {
      console.error('EnhancedConversationService: ElevenLabs TTS failed:', error);
      const conversationError: ConversationError = {
        type: 'elevenlabs',
        message: `Text-to-speech failed: ${error}`,
        recoverable: true,
        suggestedActions: [
          'Check internet connection',
          'Verify ElevenLabs API key',
          'Try a different voice',
          'Check ElevenLabs service status'
        ]
      };
      throw conversationError;
    }
  }

  pauseConversation(): void {
    this.isPaused = true;

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
      const conversationResult = await this.storageService.getConversationById(conversationId);

      if (!conversationResult.success || !conversationResult.data) {
        throw new Error(`Failed to get conversation: ${conversationResult.error}`);
      }

      const conversation = conversationResult.data;
      const updatedMessages = [...conversation.messages, message];

      const updateResult = await this.storageService.updateConversation(conversationId, updatedMessages);

      if (!updateResult.success) {
        throw new Error(`Failed to save message: ${updateResult.error}`);
      }

      if (this.currentConversation && this.currentConversation.id === conversationId) {
        this.currentConversation.messages = updatedMessages;
        this.currentConversation.updatedAt = new Date();
      }
    } catch (error) {
      const conversationError: ConversationError = {
        type: 'api',
        message: `Failed to save message: ${error}`,
        recoverable: true,
        suggestedActions: ['Try again', 'Check storage permissions']
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

      // Get native language from current user profile since it's not stored in conversation
      const user = authService.getCurrentUser();
      const nativeLanguage = user?.profile?.nativeLanguage || 'spanish'; // fallback to spanish

      return {
        targetLanguage: conversation.language,
        nativeLanguage: nativeLanguage,
        cefrLevel: conversation.cefrLevel,
        conversationHistory: conversation.messages
      };
    } catch (error) {
      console.warn('EnhancedConversationService: Failed to load conversation context:', error);
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
        recoverable: true,
        suggestedActions: ['Try again', 'Check storage permissions']
      };
      throw conversationError;
    }
  }

  async getConversationInsights(conversationId: string): Promise<ConversationInsights> {
    try {
      const result = await this.storageService.getConversationById(conversationId);

      if (!result.success || !result.data) {
        throw new Error('Conversation not found');
      }

      const conversation = result.data;
      return this.analyzeConversation(conversation);
    } catch (error) {
      console.error('EnhancedConversationService: Failed to get conversation insights:', error);
      throw error;
    }
  }

  private analyzeConversation(conversation: ConversationSession): ConversationInsights {
    const userMessages = conversation.messages.filter(m => m.role === 'user');
    const assistantMessages = conversation.messages.filter(m => m.role === 'assistant');

    // Simple analysis - in production, this would use more sophisticated NLP
    const wordsLearned = this.extractNewWords(userMessages, assistantMessages);
    const pronunciationFeedback = this.generatePronunciationFeedback(userMessages);
    const grammarCorrections = this.identifyGrammarCorrections(userMessages, assistantMessages);
    const progressMetrics = this.calculateProgressMetrics(conversation);

    return {
      wordsLearned,
      pronunciationFeedback,
      grammarCorrections,
      progressMetrics
    };
  }

  private extractNewWords(userMessages: Message[], assistantMessages: Message[]): string[] {
    // Simple implementation - extract unique words from assistant messages
    const assistantText = assistantMessages.map(m => m.content).join(' ');
    const words = assistantText.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = [...new Set(words)];
    
    // Return first 10 unique words as "learned words"
    return uniqueWords.slice(0, 10);
  }

  private generatePronunciationFeedback(userMessages: Message[]): PronunciationFeedback[] {
    // Placeholder implementation - in production, this would analyze actual pronunciation
    return userMessages.slice(0, 3).map((message, index) => ({
      word: message.content.split(' ')[0] || 'word',
      score: 75 + Math.random() * 20, // Random score between 75-95
      suggestions: ['Practice vowel sounds', 'Focus on consonant clarity']
    }));
  }

  private identifyGrammarCorrections(userMessages: Message[], assistantMessages: Message[]): GrammarCorrection[] {
    // Placeholder implementation - in production, this would use NLP to identify corrections
    return [];
  }

  private calculateProgressMetrics(conversation: ConversationSession): ProgressMetrics {
    const duration = conversation.updatedAt.getTime() - conversation.createdAt.getTime();
    const userMessages = conversation.messages.filter(m => m.role === 'user');
    const totalWords = userMessages.reduce((sum, msg) => sum + msg.content.split(' ').length, 0);

    return {
      conversationDuration: duration,
      wordsSpoken: totalWords,
      averageResponseTime: duration / Math.max(userMessages.length, 1),
      fluencyScore: Math.min(95, 60 + totalWords * 0.5) // Simple fluency calculation
    };
  }

  async suggestTopics(cefrLevel: string, language: string): Promise<string[]> {
    const topicsByLevel: { [key: string]: { [key: string]: string[] } } = {
      english: {
        A1: ['Introducing yourself', 'Family and friends', 'Daily routines', 'Food and drinks', 'Weather'],
        A2: ['Hobbies and interests', 'Travel experiences', 'Shopping', 'Health and fitness', 'Work and studies'],
        B1: ['Current events', 'Environmental issues', 'Technology', 'Cultural differences', 'Future plans'],
        B2: ['Social media impact', 'Career development', 'Global challenges', 'Art and literature', 'Scientific discoveries'],
        C1: ['Political systems', 'Economic theories', 'Philosophical concepts', 'Advanced technology', 'Cultural analysis'],
        C2: ['Abstract concepts', 'Complex social issues', 'Academic research', 'Professional expertise', 'Critical analysis']
      },
      spanish: {
        A1: ['Presentarse', 'Familia y amigos', 'Rutinas diarias', 'Comida y bebidas', 'El tiempo'],
        A2: ['Aficiones e intereses', 'Experiencias de viaje', 'Compras', 'Salud y fitness', 'Trabajo y estudios'],
        B1: ['Noticias actuales', 'Problemas ambientales', 'Tecnología', 'Diferencias culturales', 'Planes futuros'],
        B2: ['Impacto de redes sociales', 'Desarrollo profesional', 'Desafíos globales', 'Arte y literatura', 'Descubrimientos científicos'],
        C1: ['Sistemas políticos', 'Teorías económicas', 'Conceptos filosóficos', 'Tecnología avanzada', 'Análisis cultural'],
        C2: ['Conceptos abstractos', 'Problemas sociales complejos', 'Investigación académica', 'Experiencia profesional', 'Análisis crítico']
      }
    };

    const topics = topicsByLevel[language]?.[cefrLevel] || topicsByLevel.english.A1;
    return topics.slice(0, 5); // Return first 5 topics
  }

  getCurrentConversation(): ConversationSession | null {
    return this.currentConversation;
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
export const enhancedConversationService = new EnhancedConversationServiceImpl(
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_OPENAI_API_KEY) || 'test-openai-api-key',
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SPEECH_TO_TEXT_ENDPOINT) || ''
);