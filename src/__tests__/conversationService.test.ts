import { ConversationService, ConversationError } from '../services/conversationService';
import { ConversationContext } from '../types/conversation';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn(),
      startAsync: jest.fn(),
      stopAndUnloadAsync: jest.fn(),
      getURI: jest.fn(),
    })),
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
    },
  },
}));

// Mock expo-speech
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Import the class to create fresh instances
import { ExpoConversationService } from '../services/conversationService';
import { ConversationStorageService } from '../services/conversationStorageService';
import { ConversationSession, Message } from '../types/conversation';

describe('ConversationService', () => {
  let conversationService: ConversationService;
  let mockRecording: any;
  let mockStorageService: jest.Mocked<ConversationStorageService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Audio mocks
    (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Audio.setAudioModeAsync as jest.Mock).mockResolvedValue(undefined);
    
    mockRecording = {
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue('file://test-recording.m4a'),
    };
    
    (Audio.Recording as jest.Mock).mockImplementation(() => mockRecording);
    
    // Setup Speech mock
    (Speech.speak as jest.Mock).mockResolvedValue(undefined);
    
    // Create mock storage service
    mockStorageService = {
      createNewSession: jest.fn(),
      saveConversation: jest.fn(),
      updateConversation: jest.fn(),
      getConversationHistory: jest.fn(),
      getConversationById: jest.fn(),
      deleteConversation: jest.fn(),
    };
    
    // Create fresh instance for each test
    conversationService = new ExpoConversationService('test-api-key', 'http://test-endpoint', mockStorageService);
  });

  describe('Audio Recording', () => {
    it('should start listening successfully', async () => {
      await conversationService.startListening();
      
      expect(Audio.requestPermissionsAsync).toHaveBeenCalled();
      expect(mockRecording.prepareToRecordAsync).toHaveBeenCalled();
      expect(mockRecording.startAsync).toHaveBeenCalled();
    });

    it('should throw error when audio permission denied', async () => {
      (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      
      await expect(conversationService.startListening()).rejects.toThrow('Audio permission not granted');
    });

    it('should stop listening and return transcription', async () => {
      // Start listening first
      await conversationService.startListening();
      
      // Mock successful transcription
      const mockTranscription = 'Hello, how are you?';
      const mockResponse = { transcription: mockTranscription };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      
      const result = await conversationService.stopListening();
      
      expect(mockRecording.stopAndUnloadAsync).toHaveBeenCalled();
      expect(mockRecording.getURI).toHaveBeenCalled();
      expect(result).toBe(mockTranscription);
    });

    it('should handle recording errors gracefully', async () => {
      mockRecording.startAsync.mockRejectedValue(new Error('Recording failed'));
      
      await expect(conversationService.startListening()).rejects.toMatchObject({
        type: 'audio',
        message: expect.stringContaining('Failed to start recording'),
        recoverable: true,
      });
    });
  });

  describe('ChatGPT Integration', () => {
    const mockContext: ConversationContext = {
      targetLanguage: 'english',
      cefrLevel: 'B1',
      conversationHistory: [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ],
    };

    it('should send message to ChatGPT and return response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello! How can I help you today?',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await conversationService.sendMessageToChatGPT('Hello', mockContext);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json',
          }),
        })
      );
      
      expect(result).toBe('Hello! How can I help you today?');
    });

    it('should handle ChatGPT API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
      });

      await expect(
        conversationService.sendMessageToChatGPT('Hello', mockContext)
      ).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('ChatGPT API failed'),
        recoverable: true,
      });
    });

    it('should build appropriate system prompt for different languages and levels', async () => {
      const spanishContext: ConversationContext = {
        targetLanguage: 'spanish',
        cefrLevel: 'A1',
        conversationHistory: [],
      };

      const mockResponse = {
        choices: [{ message: { content: '¡Hola!' } }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await conversationService.sendMessageToChatGPT('Hola', spanishContext);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const systemMessage = requestBody.messages[0];

      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toContain('Respond in Spanish');
      expect(systemMessage.content).toContain('A1');
      expect(systemMessage.content).toContain('very simple vocabulary');
    });
  });

  describe('Text-to-Speech', () => {
    it('should speak text in correct language', async () => {
      await conversationService.speakText('Hello world', 'english');
      
      expect(Speech.speak).toHaveBeenCalledWith('Hello world', {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        voice: undefined,
      });
    });

    it('should handle different language codes', async () => {
      await conversationService.speakText('Hola mundo', 'spanish');
      
      expect(Speech.speak).toHaveBeenCalledWith('Hola mundo', {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.8,
        voice: undefined,
      });
    });

    it('should handle text-to-speech errors', async () => {
      (Speech.speak as jest.Mock).mockRejectedValue(new Error('TTS failed'));
      
      await expect(
        conversationService.speakText('Hello', 'english')
      ).rejects.toMatchObject({
        type: 'audio',
        message: expect.stringContaining('Text-to-speech failed'),
        recoverable: true,
      });
    });
  });

  describe('Conversation Control', () => {
    it('should pause conversation and stop speech', () => {
      conversationService.pauseConversation();
      
      expect(Speech.stop).toHaveBeenCalled();
    });

    it('should resume conversation', () => {
      conversationService.pauseConversation();
      conversationService.resumeConversation();
      
      // Should be able to start listening again after resume
      expect(async () => {
        await conversationService.startListening();
      }).not.toThrow();
    });

    it('should not allow operations when paused', async () => {
      conversationService.pauseConversation();
      
      const mockContext: ConversationContext = {
        targetLanguage: 'english',
        cefrLevel: 'B1',
        conversationHistory: [],
      };

      await expect(
        conversationService.sendMessageToChatGPT('Hello', mockContext)
      ).rejects.toThrow('Conversation is paused');
    });
  });

  describe('Error Handling', () => {
    it('should categorize errors correctly', async () => {
      // Test audio error
      mockRecording.startAsync.mockRejectedValue(new Error('Microphone busy'));
      
      try {
        await conversationService.startListening();
      } catch (error) {
        expect(error).toMatchObject({
          type: 'audio',
          recoverable: true,
        });
      }
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const mockContext: ConversationContext = {
        targetLanguage: 'english',
        cefrLevel: 'B1',
        conversationHistory: [],
      };

      try {
        await conversationService.sendMessageToChatGPT('Hello', mockContext);
      } catch (error) {
        expect(error).toMatchObject({
          type: 'api',
          recoverable: true,
        });
      }
    });
  });

  describe('Conversation Persistence', () => {
    const mockConversation: ConversationSession = {
      id: 'conv-123',
      userId: 'user-123',
      sessionId: 'session-123',
      messages: [],
      language: 'english',
      cefrLevel: 'B1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('startNewConversation', () => {
      it('should create and save a new conversation', async () => {
        mockStorageService.createNewSession.mockReturnValue(mockConversation);
        mockStorageService.saveConversation.mockResolvedValue({
          success: true,
          data: mockConversation,
        });

        const result = await conversationService.startNewConversation('user-123', 'english', 'B1');

        expect(mockStorageService.createNewSession).toHaveBeenCalledWith('user-123', 'english', 'B1');
        expect(mockStorageService.saveConversation).toHaveBeenCalledWith(mockConversation);
        expect(result).toEqual(mockConversation);
      });

      it('should handle save errors', async () => {
        mockStorageService.createNewSession.mockReturnValue(mockConversation);
        mockStorageService.saveConversation.mockResolvedValue({
          success: false,
          error: 'Database error',
        });

        await expect(
          conversationService.startNewConversation('user-123', 'english', 'B1')
        ).rejects.toThrow('Failed to create new conversation: Database error');
      });
    });

    describe('saveMessage', () => {
      const mockMessage: Message = {
        id: 'msg-123',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      it('should save a message to existing conversation', async () => {
        const conversationWithMessage = {
          ...mockConversation,
          messages: [mockMessage],
        };

        mockStorageService.getConversationById.mockResolvedValue({
          success: true,
          data: mockConversation,
        });
        mockStorageService.updateConversation.mockResolvedValue({
          success: true,
          data: conversationWithMessage,
        });

        await conversationService.saveMessage('conv-123', mockMessage);

        expect(mockStorageService.getConversationById).toHaveBeenCalledWith('conv-123');
        expect(mockStorageService.updateConversation).toHaveBeenCalledWith('conv-123', [mockMessage]);
      });

      it('should handle conversation not found', async () => {
        mockStorageService.getConversationById.mockResolvedValue({
          success: false,
          error: 'Not found',
        });

        await expect(
          conversationService.saveMessage('conv-123', mockMessage)
        ).rejects.toMatchObject({
          type: 'api',
          message: expect.stringContaining('Failed to get conversation'),
          recoverable: true,
        });
      });
    });

    describe('loadConversationContext', () => {
      it('should load conversation context successfully', async () => {
        const conversationWithMessages = {
          ...mockConversation,
          messages: [
            {
              id: 'msg-1',
              role: 'user' as const,
              content: 'Hello',
              timestamp: new Date(),
            },
          ],
        };

        mockStorageService.getConversationById.mockResolvedValue({
          success: true,
          data: conversationWithMessages,
        });

        const context = await conversationService.loadConversationContext('conv-123');

        expect(context).toEqual({
          targetLanguage: 'english',
          cefrLevel: 'B1',
          conversationHistory: conversationWithMessages.messages,
        });
      });

      it('should return null for non-existent conversation', async () => {
        mockStorageService.getConversationById.mockResolvedValue({
          success: false,
          error: 'Not found',
        });

        const context = await conversationService.loadConversationContext('nonexistent');

        expect(context).toBeNull();
      });
    });

    describe('getConversationHistory', () => {
      it('should retrieve conversation history', async () => {
        const mockHistory = [mockConversation];
        mockStorageService.getConversationHistory.mockResolvedValue({
          success: true,
          data: mockHistory,
        });

        const result = await conversationService.getConversationHistory('user-123', 5);

        expect(mockStorageService.getConversationHistory).toHaveBeenCalledWith({
          userId: 'user-123',
          limit: 5,
        });
        expect(result).toEqual(mockHistory);
      });

      it('should handle history retrieval errors', async () => {
        mockStorageService.getConversationHistory.mockResolvedValue({
          success: false,
          error: 'Database error',
        });

        await expect(
          conversationService.getConversationHistory('user-123')
        ).rejects.toMatchObject({
          type: 'api',
          message: expect.stringContaining('Failed to get conversation history'),
          recoverable: true,
        });
      });
    });

    describe('sendMessageToChatGPT with persistence', () => {
      it('should save both user and assistant messages', async () => {
        // Start a conversation first
        mockStorageService.createNewSession.mockReturnValue(mockConversation);
        mockStorageService.saveConversation.mockResolvedValue({
          success: true,
          data: mockConversation,
        });
        await conversationService.startNewConversation('user-123', 'english', 'B1');

        // Mock successful message saves
        mockStorageService.getConversationById.mockResolvedValue({
          success: true,
          data: mockConversation,
        });
        mockStorageService.updateConversation.mockResolvedValue({
          success: true,
          data: mockConversation,
        });

        // Mock ChatGPT response
        const mockResponse = {
          choices: [{ message: { content: 'Hello! How can I help?' } }],
        };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const mockContext: ConversationContext = {
          targetLanguage: 'english',
          cefrLevel: 'B1',
          conversationHistory: [],
        };

        const result = await conversationService.sendMessageToChatGPT('Hello', mockContext);

        expect(result).toBe('Hello! How can I help?');
        // Should save user message and assistant message
        expect(mockStorageService.updateConversation).toHaveBeenCalledTimes(2);
      });
    });
  });
});