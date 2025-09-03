// Conversation related types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface ConversationContext {
  targetLanguage: string;
  cefrLevel: string;
  conversationHistory: Message[];
}

// Audio emotion types supported by ElevenLabs
export type AudioEmotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'calm' | 'friendly' | 'professional';

// ElevenLabs-only TTS settings
export interface ElevenLabsTTSSettings {
  voiceId: string;
  useSpeaker: boolean;
  speed: number; // Speech rate (0.7 = slow, 1.0 = normal, 1.2 = fast)
  emotion: AudioEmotion; // Emotional expression
  stability: number; // Voice stability (0.0 to 1.0)
  similarityBoost: number; // Voice similarity boost (0.0 to 1.0)
}

// Audio tag configuration for different learning scenarios
export interface AudioTag {
  id: string;
  name: string;
  description: string;
  speed: number;
  emotion: AudioEmotion;
  stability: number;
  similarityBoost: number;
  icon: string;
  useCase: string;
}

// Conversation persistence types
export interface ConversationSession {
  id: string;
  userId: string;
  sessionId: string;
  messages: Message[];
  language: string;
  cefrLevel: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationHistoryFilter {
  userId?: string;
  language?: string;
  cefrLevel?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface ConversationStorageResult {
  success: boolean;
  error?: string;
  data?: ConversationSession;
}

export interface ConversationHistoryResult {
  success: boolean;
  error?: string;
  data?: ConversationSession[];
  totalCount?: number;
}