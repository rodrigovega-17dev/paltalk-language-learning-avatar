import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ConversationSession,
  ConversationHistoryFilter,
  ConversationStorageResult,
  ConversationHistoryResult,
  Message
} from '../types/conversation';

// Supabase configuration - these should be environment variables in production
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export interface ConversationStorageService {
  saveConversation(conversation: ConversationSession): Promise<ConversationStorageResult>;
  updateConversation(conversationId: string, messages: Message[]): Promise<ConversationStorageResult>;
  getConversationHistory(filter: ConversationHistoryFilter): Promise<ConversationHistoryResult>;
  getConversationById(conversationId: string): Promise<ConversationStorageResult>;
  deleteConversation(conversationId: string): Promise<{ success: boolean; error?: string }>;
  createNewSession(userId: string, language: string, cefrLevel: string): ConversationSession;
}

class SupabaseConversationStorageService implements ConversationStorageService {
  private supabase: SupabaseClient | null = null;
  private isConfigured: boolean = false;

  constructor() {
    try {
      // Only initialize if we have valid URLs
      if (SUPABASE_URL !== 'https://placeholder.supabase.co' && SUPABASE_ANON_KEY !== 'placeholder-anon-key') {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.isConfigured = true;
      } else {
        console.warn('Supabase not configured. Conversation persistence will be disabled.');
        this.isConfigured = false;
      }
    } catch (error) {
      console.warn('Failed to initialize Supabase client:', error);
      this.isConfigured = false;
    }
  }

  createNewSession(userId: string, language: string, cefrLevel: string): ConversationSession {
    const sessionId = this.generateUUID();
    const conversationId = this.generateUUID();
    const now = new Date();

    return {
      id: conversationId,
      userId,
      sessionId,
      messages: [],
      language,
      cefrLevel,
      createdAt: now,
      updatedAt: now,
    };
  }

  async saveConversation(conversation: ConversationSession): Promise<ConversationStorageResult> {
    if (!this.isConfigured || !this.supabase) {
      return {
        success: false,
        error: 'Supabase not configured. Conversation persistence is disabled.'
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .insert({
          id: conversation.id,
          user_id: conversation.userId,
          session_id: conversation.sessionId,
          messages: JSON.stringify(conversation.messages),
          language: conversation.language,
          cefr_level: conversation.cefrLevel,
          created_at: conversation.createdAt.toISOString(),
          updated_at: conversation.updatedAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDatabaseRowToConversation(data)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save conversation: ${error}`
      };
    }
  }

  async updateConversation(conversationId: string, messages: Message[]): Promise<ConversationStorageResult> {
    if (!this.isConfigured || !this.supabase) {
      return {
        success: false,
        error: 'Supabase not configured. Conversation persistence is disabled.'
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .update({
          messages: JSON.stringify(messages),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDatabaseRowToConversation(data)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update conversation: ${error}`
      };
    }
  }

  async getConversationHistory(filter: ConversationHistoryFilter): Promise<ConversationHistoryResult> {
    if (!this.isConfigured || !this.supabase) {
      return {
        success: true,
        data: [],
        totalCount: 0
      };
    }

    try {
      let query = this.supabase
        .from('conversations')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter.language) {
        query = query.eq('language', filter.language);
      }
      if (filter.cefrLevel) {
        query = query.eq('cefr_level', filter.cefrLevel);
      }
      if (filter.dateFrom) {
        query = query.gte('created_at', filter.dateFrom.toISOString());
      }
      if (filter.dateTo) {
        query = query.lte('created_at', filter.dateTo.toISOString());
      }

      // Apply pagination
      if (filter.offset) {
        query = query.range(filter.offset, (filter.offset + (filter.limit || 10)) - 1);
      } else if (filter.limit) {
        query = query.limit(filter.limit);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      const conversations = data?.map(row => this.mapDatabaseRowToConversation(row)) || [];

      return {
        success: true,
        data: conversations,
        totalCount: count || 0
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get conversation history: ${error}`
      };
    }
  }

  async getConversationById(conversationId: string): Promise<ConversationStorageResult> {
    if (!this.isConfigured || !this.supabase) {
      return {
        success: false,
        error: 'Supabase not configured. Conversation persistence is disabled.'
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDatabaseRowToConversation(data)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get conversation: ${error}`
      };
    }
  }

  async deleteConversation(conversationId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured || !this.supabase) {
      return {
        success: false,
        error: 'Supabase not configured. Conversation persistence is disabled.'
      };
    }

    try {
      const { error } = await this.supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete conversation: ${error}`
      };
    }
  }

  private mapDatabaseRowToConversation(row: any): ConversationSession {
    let messages: Message[] = [];

    try {
      if (typeof row.messages === 'string') {
        messages = JSON.parse(row.messages);
      } else if (Array.isArray(row.messages)) {
        messages = row.messages;
      }

      // Ensure message timestamps are Date objects
      messages = messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.warn('Failed to parse conversation messages:', error);
      messages = [];
    }

    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      messages,
      language: row.language,
      cefrLevel: row.cefr_level,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private generateUUID(): string {
    // Simple UUID v4 generator for React Native
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export singleton instance
export const conversationStorageService = new SupabaseConversationStorageService();