import { conversationService, ConversationService, ConversationError } from './conversationService';
import { authService } from './authService';
import { profileService } from './profileService';
import { Message, ConversationContext, ElevenLabsTTSSettings } from '../types/conversation';

export interface ConversationFlowController {
  startConversation(): Promise<void>;
  handleUserInput(): Promise<void>;
  pauseConversation(): void;
  resumeConversation(): void;
  endConversation(): void;
  getCurrentContext(): ConversationContext | null;
  getConversationHistory(): Message[];
  isRecording(): boolean;
  isPaused(): boolean;
  setSpeakerEnabled(enabled: boolean): void;
  getSpeakerEnabled(): boolean;
  updateLanguageSettings(targetLanguage: string, cefrLevel: string): void;
  updateNativeLanguageSettings(nativeLanguage: string): void;
  setTTSSettings(settings: ElevenLabsTTSSettings): void;
  getTTSSettings(): ElevenLabsTTSSettings;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onMessageAdded?: (message: Message) => void;
}

export interface ConversationState {
  isActive: boolean;
  isRecording: boolean;
  isPaused: boolean;
  context: ConversationContext | null;
  messages: Message[];
  currentSessionId: string;
}

export class DefaultConversationFlowController implements ConversationFlowController {
  private state: ConversationState;
  private conversationService: ConversationService;
  private errorHandler: (error: ConversationError) => void;
  private useSpeaker: boolean = true;
  private ttsSettings: ElevenLabsTTSSettings = {
    voiceId: '',
    useSpeaker: true,
    speed: 1.0,
    emotion: 'neutral',
    stability: 0.6,
    similarityBoost: 0.5
  };
  public onSpeechStart?: () => void;
  public onSpeechEnd?: () => void;
  public onMessageAdded?: (message: Message) => void;

  constructor(
    conversationService: ConversationService,
    errorHandler: (error: ConversationError) => void = this.defaultErrorHandler
  ) {
    this.conversationService = conversationService;
    this.errorHandler = errorHandler;
    this.state = {
      isActive: false,
      isRecording: false,
      isPaused: false,
      context: null,
      messages: [],
      currentSessionId: this.generateSessionId(),
    };
    
    // TTS settings are initialized with ElevenLabs defaults
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private defaultErrorHandler(error: ConversationError): void {
    console.error('Conversation error:', error);
    // In production, this would integrate with error reporting service
  }

  async startConversation(): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use profile data from the authenticated user object
      if (!user.profile) {
        throw new Error('User profile not available');
      }

      this.state.context = {
        targetLanguage: user.profile.targetLanguage,
        nativeLanguage: user.profile.nativeLanguage,
        cefrLevel: user.profile.cefrLevel,
        conversationHistory: [],
      };

      this.state.isActive = true;
      this.state.isPaused = false;
      this.state.messages = [];
      this.state.currentSessionId = this.generateSessionId();

      // Start with a greeting from the avatar
      await this.sendAvatarGreeting();
    } catch (error) {
      console.log('ConversationFlowController startConversation error:', error);
      console.log('Error type:', typeof error);
      console.log('Error instanceof Error:', error instanceof Error);
      
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      const conversationError: ConversationError = {
        type: 'api',
        message: `Failed to start conversation: ${errorMessage}`,
        recoverable: true
      };
      this.errorHandler(conversationError);
      throw conversationError;
    }
  }

  private async sendAvatarGreeting(): Promise<void> {
    if (!this.state.context) return;

    const greetingMessage = this.getGreetingMessage(this.state.context.targetLanguage);
    const greetingResponse = await this.conversationService.sendMessageToChatGPT(
      'Please greet the user and ask how they are doing today. Keep it simple and friendly.',
      this.state.context
    );

    const avatarMessage: Message = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: greetingResponse,
      timestamp: new Date(),
    };

    this.state.messages.push(avatarMessage);
    this.state.context.conversationHistory.push(avatarMessage);
    
    // Notify UI that a message was added
    this.onMessageAdded?.(avatarMessage);

    // Speak the greeting - this will resolve when speech is complete
    await this.conversationService.speakText(
      greetingResponse,
      this.state.context.targetLanguage,
      this.ttsSettings,
      this.onSpeechStart, // Pass callback to trigger when audio actually starts
      this.onSpeechEnd    // Pass callback to trigger when audio ends
    );
  }

  private getGreetingMessage(language: string): string {
    const greetings: { [key: string]: string } = {
      english: 'Hello! How are you doing today?',
      spanish: '¡Hola! ¿Cómo estás hoy?',
      french: 'Bonjour! Comment allez-vous aujourd\'hui?',
      german: 'Hallo! Wie geht es dir heute?'
    };
    return greetings[language] || greetings.english;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async handleUserInput(): Promise<void> {
    if (!this.state.isActive || this.state.isPaused || !this.state.context) {
      throw new Error('Conversation not active or paused');
    }

    try {
      // Start recording user input
      this.state.isRecording = true;
      await this.conversationService.startListening();
    } catch (error) {
      this.state.isRecording = false;
      if (error instanceof Object && 'type' in error && error.type === 'permission') {
        const conversationError: ConversationError = {
          type: 'permission',
          message: 'Microphone permission required for voice input',
          recoverable: true
        };
        this.errorHandler(conversationError);
        throw conversationError;
      }
      if (error instanceof Error && error.message.includes('permission')) {
        const conversationError: ConversationError = {
          type: 'permission',
          message: 'Microphone permission required for voice input',
          recoverable: true
        };
        this.errorHandler(conversationError);
        throw conversationError;
      }
      throw error;
    }
  }

  async finishUserInput(): Promise<void> {
    if (!this.state.isRecording || !this.state.context) {
      return;
    }

    try {
      // Stop recording and get transcription with target language for better accuracy
      const transcription = await this.conversationService.stopListening(this.state.context.targetLanguage);
      this.state.isRecording = false;

      if (!transcription || !transcription.trim()) {
        console.log('No speech detected or transcription failed');
        return; // No input detected or transcription failed
      }

      // Add user message to conversation
      const userMessage: Message = {
        id: this.generateMessageId(),
        role: 'user',
        content: transcription,
        timestamp: new Date(),
      };

      this.state.messages.push(userMessage);
      this.state.context.conversationHistory.push(userMessage);
      
      // Notify UI that user message was added
      this.onMessageAdded?.(userMessage);

      // Get AI response
      const aiResponse = await this.conversationService.sendMessageToChatGPT(
        transcription,
        this.state.context
      );

      // Add AI message to conversation
      const aiMessage: Message = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      this.state.messages.push(aiMessage);
      this.state.context.conversationHistory.push(aiMessage);
      
      // Notify UI that AI message was added
      this.onMessageAdded?.(aiMessage);

      // Speak the AI response - this will resolve when speech is complete
      await this.conversationService.speakText(
        aiResponse,
        this.state.context.targetLanguage,
        this.ttsSettings,
        this.onSpeechStart, // Pass callback to trigger when audio actually starts
        this.onSpeechEnd    // Pass callback to trigger when audio ends
      );

      // Save conversation to database (implement this based on your needs)
      await this.saveConversationToDatabase();

    } catch (error) {
      this.state.isRecording = false;
      if (error instanceof Object && 'type' in error) {
        this.errorHandler(error as ConversationError);
      } else {
        const conversationError: ConversationError = {
          type: 'api',
          message: `Failed to process user input: ${error}`,
          recoverable: true
        };
        this.errorHandler(conversationError);
      }
      throw error;
    }
  }

  private async saveConversationToDatabase(): Promise<void> {
    // This would integrate with Supabase to save conversation history
    // Implementation depends on your database schema
    try {
      // Placeholder for database save operation
      console.log('Saving conversation to database...', {
        sessionId: this.state.currentSessionId,
        messageCount: this.state.messages.length
      });
    } catch (error) {
      console.warn('Failed to save conversation to database:', error);
      // Don't throw error here as it shouldn't interrupt the conversation flow
    }
  }

  pauseConversation(): void {
    this.state.isPaused = true;
    this.conversationService.pauseConversation();
    
    if (this.state.isRecording) {
      this.state.isRecording = false;
    }
  }

  resumeConversation(): void {
    this.state.isPaused = false;
    this.conversationService.resumeConversation();
  }

  endConversation(): void {
    this.state.isActive = false;
    this.state.isRecording = false;
    this.state.isPaused = false;
    this.conversationService.pauseConversation();
    
    // Save final conversation state
    this.saveConversationToDatabase().catch(error => {
      console.warn('Failed to save final conversation state:', error);
    });
  }

  getCurrentContext(): ConversationContext | null {
    return this.state.context;
  }

  getConversationHistory(): Message[] {
    return [...this.state.messages];
  }

  isRecording(): boolean {
    return this.state.isRecording;
  }

  isPaused(): boolean {
    return this.state.isPaused;
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  // Method to handle continuous recording (press and hold)
  async startContinuousRecording(): Promise<void> {
    await this.handleUserInput();
  }

  async stopContinuousRecording(): Promise<void> {
    await this.finishUserInput();
  }

  // Method to update speaker setting
  setSpeakerEnabled(enabled: boolean): void {
    this.useSpeaker = enabled;
    this.ttsSettings.useSpeaker = enabled;
    console.log('ConversationFlowController: Speaker enabled:', enabled);
  }

  getSpeakerEnabled(): boolean {
    return this.useSpeaker;
  }

  setTTSSettings(settings: ElevenLabsTTSSettings): void {
    this.ttsSettings = settings;
    this.useSpeaker = settings.useSpeaker;
  }

  getTTSSettings(): ElevenLabsTTSSettings {
    return this.ttsSettings;
  }

  updateLanguageSettings(targetLanguage: string, cefrLevel: string): void {
    if (this.state.context) {
      this.state.context.targetLanguage = targetLanguage;
      this.state.context.cefrLevel = cefrLevel;
      console.log('ConversationFlowController: Language settings updated:', { targetLanguage, cefrLevel });
    }
  }

  updateNativeLanguageSettings(nativeLanguage: string): void {
    if (this.state.context) {
      this.state.context.nativeLanguage = nativeLanguage;
      console.log('ConversationFlowController: Native language settings updated:', { nativeLanguage });
    }
  }
}

// Export singleton instance
export const conversationFlowController = new DefaultConversationFlowController(
  conversationService,
  (error: ConversationError) => {
    // Default error handler - in production this would integrate with error reporting
    console.error('Conversation Flow Error:', error);
    
    // You could emit events here for UI components to handle
    // EventEmitter.emit('conversationError', error);
  }
);