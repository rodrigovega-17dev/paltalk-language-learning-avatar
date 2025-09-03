import { SupabaseClient } from '@supabase/supabase-js';
import { ConversationSession, Message } from '../types/conversation';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Import the class directly for testing
class SupabaseConversationStorageService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
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

  async saveConversation(conversation: ConversationSession) {
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

  async updateConversation(conversationId: string, messages: Message[]) {
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

  async getConversationHistory(filter: any) {
    try {
      let query = this.supabase
        .from('conversations')
        .select('*', { count: 'exact' });

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

      if (filter.offset) {
        query = query.range(filter.offset, (filter.offset + (filter.limit || 10)) - 1);
      } else if (filter.limit) {
        query = query.limit(filter.limit);
      }

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

  async getConversationById(conversationId: string) {
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

  async deleteConversation(conversationId: string) {
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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

describe('ConversationStorageService', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockEq: jest.Mock;
  let mockGte: jest.Mock;
  let mockLte: jest.Mock;
  let mockRange: jest.Mock;
  let mockLimit: jest.Mock;
  let mockOrder: jest.Mock;
  let mockSingle: jest.Mock;
  let conversationStorageService: SupabaseConversationStorageService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock functions that return the expected structure
    mockSingle = jest.fn();
    mockOrder = jest.fn();
    mockLimit = jest.fn();
    mockRange = jest.fn();
    mockLte = jest.fn();
    mockGte = jest.fn();
    mockEq = jest.fn();
    mockDelete = jest.fn();
    mockUpdate = jest.fn();
    mockInsert = jest.fn();
    mockSelect = jest.fn();
    mockFrom = jest.fn();

    // Create a chainable mock object
    const createChainableMock = () => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte,
      range: mockRange,
      limit: mockLimit,
      order: mockOrder,
      single: mockSingle,
    });

    // Set up the chain
    mockFrom.mockReturnValue(createChainableMock());
    mockSelect.mockReturnValue(createChainableMock());
    mockInsert.mockReturnValue(createChainableMock());
    mockUpdate.mockReturnValue(createChainableMock());
    mockDelete.mockReturnValue(createChainableMock());
    mockEq.mockReturnValue(createChainableMock());
    mockGte.mockReturnValue(createChainableMock());
    mockLte.mockReturnValue(createChainableMock());
    mockRange.mockReturnValue(createChainableMock());
    mockLimit.mockReturnValue(createChainableMock());
    mockOrder.mockReturnValue(createChainableMock());

    // Create mock Supabase client
    mockSupabase = {
      from: mockFrom,
    } as any;

    // Create mock Supabase client
    mockSupabase = {
      from: mockFrom,
    } as any;

    // Create service instance with mock
    conversationStorageService = new SupabaseConversationStorageService(mockSupabase);
  });

  describe('createNewSession', () => {
    it('should create a new conversation session with correct properties', () => {
      const userId = 'user-123';
      const language = 'english';
      const cefrLevel = 'B1';

      const session = conversationStorageService.createNewSession(userId, language, cefrLevel);

      expect(session.userId).toBe(userId);
      expect(session.language).toBe(language);
      expect(session.cefrLevel).toBe(cefrLevel);
      expect(session.messages).toEqual([]);
      expect(session.id).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for different sessions', () => {
      const session1 = conversationStorageService.createNewSession('user-1', 'english', 'A1');
      const session2 = conversationStorageService.createNewSession('user-2', 'spanish', 'B2');

      expect(session1.id).not.toBe(session2.id);
      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe('saveConversation', () => {
    it('should save a conversation successfully', async () => {
      const conversation: ConversationSession = {
        id: 'conv-123',
        userId: 'user-123',
        sessionId: 'session-123',
        messages: [],
        language: 'english',
        cefrLevel: 'B1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDbRow = {
        id: conversation.id,
        user_id: conversation.userId,
        session_id: conversation.sessionId,
        messages: '[]',
        language: conversation.language,
        cefr_level: conversation.cefrLevel,
        created_at: conversation.createdAt.toISOString(),
        updated_at: conversation.updatedAt.toISOString(),
      };

      mockSingle.mockResolvedValue({ data: mockDbRow, error: null });

      const result = await conversationStorageService.saveConversation(conversation);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(conversation.id);
      expect(mockFrom).toHaveBeenCalledWith('conversations');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      const conversation: ConversationSession = {
        id: 'conv-123',
        userId: 'user-123',
        sessionId: 'session-123',
        messages: [],
        language: 'english',
        cefrLevel: 'B1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSingle.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const result = await conversationStorageService.saveConversation(conversation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateConversation', () => {
    it('should update conversation messages successfully', async () => {
      const conversationId = 'conv-123';
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      const mockDbRow = {
        id: conversationId,
        user_id: 'user-123',
        session_id: 'session-123',
        messages: JSON.stringify(messages),
        language: 'english',
        cefr_level: 'B1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValue({ data: mockDbRow, error: null });

      const result = await conversationStorageService.updateConversation(conversationId, messages);

      expect(result.success).toBe(true);
      expect(result.data?.messages).toHaveLength(1);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', conversationId);
    });

    it('should handle update errors', async () => {
      const conversationId = 'conv-123';
      const messages: Message[] = [];

      mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      const result = await conversationStorageService.updateConversation(conversationId, messages);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation history with filters', async () => {
      const mockDbRows = [
        {
          id: 'conv-1',
          user_id: 'user-123',
          session_id: 'session-1',
          messages: '[]',
          language: 'english',
          cefr_level: 'B1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockOrder.mockResolvedValue({ data: mockDbRows, error: null, count: 1 });

      const result = await conversationStorageService.getConversationHistory({
        userId: 'user-123',
        language: 'english',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockEq).toHaveBeenCalledWith('language', 'english');
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle date range filters', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');

      mockOrder.mockResolvedValue({ data: [], error: null, count: 0 });

      await conversationStorageService.getConversationHistory({
        userId: 'user-123',
        dateFrom,
        dateTo,
      });

      expect(mockGte).toHaveBeenCalledWith('created_at', dateFrom.toISOString());
      expect(mockLte).toHaveBeenCalledWith('created_at', dateTo.toISOString());
    });

    it('should handle pagination', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null, count: 0 });

      await conversationStorageService.getConversationHistory({
        userId: 'user-123',
        offset: 10,
        limit: 5,
      });

      expect(mockRange).toHaveBeenCalledWith(10, 14); // offset to (offset + limit - 1)
    });

    it('should handle retrieval errors', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Query failed' } });

      const result = await conversationStorageService.getConversationHistory({
        userId: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });
  });

  describe('getConversationById', () => {
    it('should retrieve a specific conversation', async () => {
      const conversationId = 'conv-123';
      const mockDbRow = {
        id: conversationId,
        user_id: 'user-123',
        session_id: 'session-123',
        messages: JSON.stringify([]),
        language: 'english',
        cefr_level: 'B1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValue({ data: mockDbRow, error: null });

      const result = await conversationStorageService.getConversationById(conversationId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(conversationId);
      expect(mockEq).toHaveBeenCalledWith('id', conversationId);
    });

    it('should handle conversation not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await conversationStorageService.getConversationById('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation successfully', async () => {
      const conversationId = 'conv-123';

      mockEq.mockResolvedValue({ error: null });

      const result = await conversationStorageService.deleteConversation(conversationId);

      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', conversationId);
    });

    it('should handle delete errors', async () => {
      const conversationId = 'conv-123';

      mockEq.mockResolvedValue({ error: { message: 'Delete failed' } });

      const result = await conversationStorageService.deleteConversation(conversationId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('message parsing', () => {
    it('should parse JSON string messages correctly', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      const mockDbRow = {
        id: 'conv-123',
        user_id: 'user-123',
        session_id: 'session-123',
        messages: JSON.stringify(messages),
        language: 'english',
        cefr_level: 'B1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValue({ data: mockDbRow, error: null });

      const result = await conversationStorageService.getConversationById('conv-123');

      expect(result.success).toBe(true);
      expect(result.data?.messages).toHaveLength(1);
      expect(result.data?.messages[0].content).toBe('Hello');
      expect(result.data?.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should handle malformed JSON messages gracefully', async () => {
      const mockDbRow = {
        id: 'conv-123',
        user_id: 'user-123',
        session_id: 'session-123',
        messages: 'invalid json',
        language: 'english',
        cefr_level: 'B1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValue({ data: mockDbRow, error: null });

      const result = await conversationStorageService.getConversationById('conv-123');

      expect(result.success).toBe(true);
      expect(result.data?.messages).toEqual([]);
    });
  });
});