import { ExpoConversationService } from '../services/conversationService';
import { elevenLabsService } from '../services/elevenLabsService';
import { conversationStorageService } from '../services/conversationStorageService';
import { Audio } from 'expo-av';
import { ElevenLabsTTSSettings } from '../types/conversation';

// Mock dependencies
jest.mock('../services/elevenLabsService');
jest.mock('../services/conversationStorageService');
jest.mock('expo-av');

const mockElevenLabsService = elevenLabsService as jest.Mocked<typeof elevenLabsService>;
const mockConversationStorageService = conversationStorageService as jest.Mocked<typeof conversationStorageService>;
const mockAudio = Audio as jest.Mocked<typeof Audio>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ExpoConversationService (ElevenLabs-only)', () => {
  let service: ExpoConversationService;
  const mockApiKey = 'test-openai-key';

  beforeEach(() => {
    service = new ExpoConversationService(mockApiKey, '', mockConversationStorageService);
    jest.clearAllMocks();

    // Setup default mocks
    mockAudio.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockAudio.setAudioModeAsync.mockResolvedValue();
    mockElevenLabsService.getDefaultVoiceForLanguage.mockResolvedValue('default-voice-id');
    mockElevenLabsService.speakText.mockResolvedValue();
  });

  describe('speakText', () => {
    const mockTTSSettings: ElevenLabsTTSSettings = {
      voiceId: 'test-voice-id',
      useSpeaker: true,
      speed: 1.0,
      emotion: 'neutral',
      stability: 0.6,
      similarityBoost: 0.5
    };

    it('should use ElevenLabs service for speech synthesis', async () => {
      const text = 'Hello world';
      const language = 'english';

      await service.speakText(text, language, mockTTSSettings);

      expect(mockElevenLabsService.speakText).toHaveBeenCalledWith(
        text,
        'test-voice-id',
        language,
        true,
        1.0,
        'neutral',
        0.6,
        0.5
      );
    });

    it('should use default voice when voiceId is not provided', async () => {
      const text = 'Hello world';
      const language = 'english';
      const settingsWithoutVoice: ElevenLabsTTSSettings = {
        ...mockTTSSettings,
        voiceId: ''
      };

      await service.speakText(text, language, settingsWithoutVoice);

      expect(mockElevenLabsService.getDefaultVoiceForLanguage).toHaveBeenCalledWith(language);
      expect(mockElevenLabsService.speakText).toHaveBeenCalledWith(
        text,
        'default-voice-id',
        language,
        true,
        1.0,
        'neutral',
        0.6,
        0.5
      );
    });

    it('should use default values for missing TTS settings', async () => {
      const text = 'Hello world';
      const language = 'english';
      const minimalSettings: ElevenLabsTTSSettings = {
        voiceId: 'test-voice-id',
        useSpeaker: true,
        speed: 0,
        emotion: 'neutral',
        stability: 0,
        similarityBoost: 0
      };

      await service.speakText(text, language, minimalSettings);

      expect(mockElevenLabsService.speakText).toHaveBeenCalledWith(
        text,
        'test-voice-id',
        language,
        true,
        1.0, // Default speed
        'neutral',
        0.6, // Default stability
        0.5  // Default similarity boost
      );
    });

    it('should not speak when conversation is paused', async () => {
      const text = 'Hello world';
      const language = 'english';

      // Pause the conversation
      service.pauseConversation();

      await service.speakText(text, language, mockTTSSettings);

      expect(mockElevenLabsService.speakText).not.toHaveBeenCalled();
    });

    it('should throw ConversationError when ElevenLabs fails', async () => {
      const text = 'Hello world';
      const language = 'english';
      const error = new Error('ElevenLabs API error');

      mockElevenLabsService.speakText.mockRejectedValue(error);

      await expect(service.speakText(text, language, mockTTSSettings)).rejects.toMatchObject({
        type: 'audio',
        message: 'ElevenLabs TTS failed: Error: ElevenLabs API error',
        recoverable: true
      });
    });
  });

  describe('sendMessageToChatGPT', () => {
    const mockContext = {
      targetLanguage: 'english',
      cefrLevel: 'A1',
      conversationHistory: []
    };

    it('should send message to ChatGPT and return response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello! How can I help you today?'
            }
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const userMessage = 'Hello';
      const response = await service.sendMessageToChatGPT(userMessage, mockContext);

      expect(response).toBe('Hello! How can I help you today?');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should build appropriate system prompt based on context', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const context = {
        targetLanguage: 'spanish',
        cefrLevel: 'B2',
        conversationHistory: []
      };

      await service.sendMessageToChatGPT('Hola', context);

      const requestBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      const systemMessage = requestBody.messages[0];

      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toContain('Respond in Spanish');
      expect(systemMessage.content).toContain('B2');
      expect(systemMessage.content).toContain('more advanced vocabulary');
    });

    it('should handle ChatGPT API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429
      } as Response);

      const userMessage = 'Hello';
      
      await expect(service.sendMessageToChatGPT(userMessage, mockContext)).rejects.toMatchObject({
        type: 'api',
        message: 'ChatGPT API failed: Error: ChatGPT API error: 429',
        recoverable: true
      });
    });
  });

  describe('startListening', () => {
    let mockRecording: any;

    beforeEach(() => {
      mockRecording = {
        prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
        startAsync: jest.fn().mockResolvedValue(undefined),
        stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
        getURI: jest.fn().mockReturnValue('file://recording.m4a')
      };

      mockAudio.Recording = jest.fn().mockImplementation(() => mockRecording);
    });

    it('should start recording successfully', async () => {
      await service.startListening();

      expect(mockAudio.requestPermissionsAsync).toHaveBeenCalled();
      expect(mockAudio.setAudioModeAsync).toHaveBeenCalled();
      expect(mockRecording.prepareToRecordAsync).toHaveBeenCalled();
      expect(mockRecording.startAsync).toHaveBeenCalled();
    });

    it('should throw error when audio permission is denied', async () => {
      mockAudio.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

      await expect(service.startListening()).rejects.toThrow('Audio permission not granted');
    });

    it('should throw error when already recording', async () => {
      // Start recording first
      await service.startListening();

      // Try to start again
      await expect(service.startListening()).rejects.toThrow('Already recording or conversation is paused');
    });
  });

  describe('stopListening', () => {
    let mockRecording: any;

    beforeEach(() => {
      mockRecording = {
        prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
        startAsync: jest.fn().mockResolvedValue(undefined),
        stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
        getURI: jest.fn().mockReturnValue('file://recording.m4a')
      };

      mockAudio.Recording = jest.fn().mockImplementation(() => mockRecording);
    });

    it('should stop recording and transcribe audio', async () => {
      const mockTranscription = { text: 'Hello world' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTranscription)
      } as Response);

      // Start recording first
      await service.startListening();
      
      // Stop recording
      const transcription = await service.stopListening();

      expect(mockRecording.stopAndUnloadAsync).toHaveBeenCalled();
      expect(mockRecording.getURI).toHaveBeenCalled();
      expect(transcription).toBe('Hello world');
      
      // Check Whisper API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockApiKey}`
          }
        })
      );
    });

    it('should throw error when not recording', async () => {
      await expect(service.stopListening()).rejects.toThrow('Not currently recording');
    });

    it('should handle Whisper API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      // Start recording first
      await service.startListening();
      
      await expect(service.stopListening()).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('Speech-to-text failed'),
        recoverable: true
      });
    });
  });

  describe('pauseConversation', () => {
    it('should pause conversation and stop recording', async () => {
      const mockRecording = {
        prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
        startAsync: jest.fn().mockResolvedValue(undefined),
        stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
        getURI: jest.fn().mockReturnValue('file://recording.m4a')
      };

      mockAudio.Recording = jest.fn().mockImplementation(() => mockRecording);

      // Start recording
      await service.startListening();
      
      // Pause conversation
      service.pauseConversation();

      expect(mockRecording.stopAndUnloadAsync).toHaveBeenCalled();
    });
  });

  describe('resumeConversation', () => {
    it('should resume paused conversation', () => {
      // Pause first
      service.pauseConversation();
      
      // Resume
      service.resumeConversation();

      // Should be able to speak again
      const mockTTSSettings: ElevenLabsTTSSettings = {
        voiceId: 'test-voice-id',
        useSpeaker: true,
        speed: 1.0,
        emotion: 'neutral',
        stability: 0.6,
        similarityBoost: 0.5
      };

      service.speakText('Hello', 'english', mockTTSSettings);
      expect(mockElevenLabsService.speakText).toHaveBeenCalled();
    });
  });

  describe('conversation persistence', () => {
    it('should start new conversation and save messages', async () => {
      const mockConversation = {
        id: 'conv-1',
        userId: 'user-1',
        sessionId: 'session-1',
        messages: [],
        language: 'english',
        cefrLevel: 'A1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockConversationStorageService.createNewSession.mockReturnValue(mockConversation);
      mockConversationStorageService.saveConversation.mockResolvedValue({
        success: true,
        data: mockConversation
      });

      const conversation = await service.startNewConversation('user-1', 'english', 'A1');

      expect(conversation).toEqual(mockConversation);
      expect(mockConversationStorageService.createNewSession).toHaveBeenCalledWith('user-1', 'english', 'A1');
      expect(mockConversationStorageService.saveConversation).toHaveBeenCalledWith(mockConversation);
    });

    it('should save messages during conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        userId: 'user-1',
        sessionId: 'session-1',
        messages: [],
        language: 'english',
        cefrLevel: 'A1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdatedConversation = {
        ...mockConversation,
        messages: [
          {
            id: expect.any(String),
            role: 'user' as const,
            content: 'Hello',
            timestamp: expect.any(Date)
          }
        ]
      };

      mockConversationStorageService.createNewSession.mockReturnValue(mockConversation);
      mockConversationStorageService.saveConversation.mockResolvedValue({
        success: true,
        data: mockConversation
      });
      mockConversationStorageService.getConversationById.mockResolvedValue({
        success: true,
        data: mockConversation
      });
      mockConversationStorageService.updateConversation.mockResolvedValue({
        success: true,
        data: mockUpdatedConversation
      });

      // Start conversation
      await service.startNewConversation('user-1', 'english', 'A1');

      // Send message (which should save user message and assistant response)
      const mockChatGPTResponse = {
        choices: [{ message: { content: 'Hi there!' } }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChatGPTResponse)
      } as Response);

      const context = {
        targetLanguage: 'english',
        cefrLevel: 'A1',
        conversationHistory: []
      };

      await service.sendMessageToChatGPT('Hello', context);

      expect(mockConversationStorageService.updateConversation).toHaveBeenCalledTimes(2); // User message + assistant message
    });
  });
});