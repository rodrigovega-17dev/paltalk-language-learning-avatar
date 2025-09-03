// Mock expo modules first
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Recording: jest.fn(),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

import { ConversationFlowController, DefaultConversationFlowController } from '../services/conversationFlowController';
import { ConversationService, ConversationError } from '../services/conversationService';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { User, UserProfile } from '../types/auth';

// Mock dependencies
jest.mock('../services/authService');
jest.mock('../services/profileService');

describe('ConversationFlowController', () => {
  let conversationFlowController: ConversationFlowController;
  let mockConversationService: jest.Mocked<ConversationService>;
  
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    profile: {
      targetLanguage: 'english',
      cefrLevel: 'B1',
      subscriptionStatus: 'active',
      trialStartDate: new Date(),
    },
  };

  const mockProfile: UserProfile = {
    targetLanguage: 'english',
    cefrLevel: 'B1',
    subscriptionStatus: 'active',
    trialStartDate: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup auth service mock
    (authService.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
    
    // Setup profile service mock
    (profileService.getProfile as jest.Mock).mockResolvedValue({
      profile: mockProfile,
      error: null,
    });
    
    // Create mock conversation service
    mockConversationService = {
      startListening: jest.fn().mockResolvedValue(undefined),
      stopListening: jest.fn().mockResolvedValue('Hello, I am fine'),
      sendMessageToChatGPT: jest.fn().mockResolvedValue('Hello! How are you today?'),
      speakText: jest.fn().mockResolvedValue(undefined),
      pauseConversation: jest.fn(),
      resumeConversation: jest.fn(),
    };
    
    // Create fresh controller instance
    conversationFlowController = new DefaultConversationFlowController(mockConversationService);
  });

  describe('Starting Conversation', () => {
    it('should start conversation successfully', async () => {
      await conversationFlowController.startConversation();
      
      expect(authService.getCurrentUser).toHaveBeenCalled();
      expect(profileService.getProfile).toHaveBeenCalledWith(mockUser.id);
      expect(mockConversationService.sendMessageToChatGPT).toHaveBeenCalled();
      expect(mockConversationService.speakText).toHaveBeenCalled();
      
      const context = conversationFlowController.getCurrentContext();
      expect(context).toEqual({
        targetLanguage: 'english',
        cefrLevel: 'B1',
        conversationHistory: expect.any(Array),
      });
    });

    it('should fail when user not authenticated', async () => {
      (authService.getCurrentUser as jest.Mock).mockReturnValue(null);
      
      await expect(conversationFlowController.startConversation()).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('User not authenticated'),
      });
    });

    it('should fail when profile cannot be loaded', async () => {
      (profileService.getProfile as jest.Mock).mockResolvedValue({
        profile: null,
        error: 'Profile not found',
      });
      
      await expect(conversationFlowController.startConversation()).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('Failed to start conversation'),
      });
    });

    it('should send appropriate greeting based on language', async () => {
      const spanishProfile = { ...mockProfile, targetLanguage: 'spanish' };
      (profileService.getProfile as jest.Mock).mockResolvedValue({
        profile: spanishProfile,
        error: null,
      });
      
      await conversationFlowController.startConversation();
      
      expect(mockConversationService.sendMessageToChatGPT).toHaveBeenCalledWith(
        expect.stringContaining('greet the user'),
        expect.objectContaining({
          targetLanguage: 'spanish',
        })
      );
    });
  });

  describe('Handling User Input', () => {
    beforeEach(async () => {
      await conversationFlowController.startConversation();
    });

    it('should handle user input successfully', async () => {
      await conversationFlowController.handleUserInput();
      
      expect(mockConversationService.startListening).toHaveBeenCalled();
      expect(conversationFlowController.isRecording()).toBe(true);
    });

    it('should process complete user input flow', async () => {
      // Start recording
      await conversationFlowController.handleUserInput();
      
      // Finish recording and process
      await conversationFlowController.finishUserInput();
      
      expect(mockConversationService.stopListening).toHaveBeenCalled();
      expect(mockConversationService.sendMessageToChatGPT).toHaveBeenCalledWith(
        'Hello, I am fine',
        expect.any(Object)
      );
      expect(mockConversationService.speakText).toHaveBeenCalled();
      
      const history = conversationFlowController.getConversationHistory();
      expect(history).toHaveLength(3); // Greeting + User message + AI response
    });

    it('should handle empty transcription gracefully', async () => {
      mockConversationService.stopListening.mockResolvedValue('   '); // Empty/whitespace
      
      await conversationFlowController.handleUserInput();
      await conversationFlowController.finishUserInput();
      
      // Should not send to ChatGPT or add to history
      expect(mockConversationService.sendMessageToChatGPT).toHaveBeenCalledTimes(1); // Only greeting
    });

    it('should handle permission errors', async () => {
      const permissionError: ConversationError = {
        type: 'permission',
        message: 'Microphone permission required',
        recoverable: true,
      };
      
      mockConversationService.startListening.mockRejectedValue(permissionError);
      
      await expect(conversationFlowController.handleUserInput()).rejects.toMatchObject({
        type: 'permission',
        message: 'Microphone permission required for voice input',
      });
    });
  });

  describe('Conversation Control', () => {
    beforeEach(async () => {
      await conversationFlowController.startConversation();
    });

    it('should pause conversation', () => {
      conversationFlowController.pauseConversation();
      
      expect(mockConversationService.pauseConversation).toHaveBeenCalled();
      expect(conversationFlowController.isPaused()).toBe(true);
    });

    it('should resume conversation', () => {
      conversationFlowController.pauseConversation();
      conversationFlowController.resumeConversation();
      
      expect(mockConversationService.resumeConversation).toHaveBeenCalled();
      expect(conversationFlowController.isPaused()).toBe(false);
    });

    it('should end conversation', () => {
      conversationFlowController.endConversation();
      
      expect(mockConversationService.pauseConversation).toHaveBeenCalled();
      expect(conversationFlowController.isActive()).toBe(false);
    });

    it('should not allow input when paused', async () => {
      conversationFlowController.pauseConversation();
      
      await expect(conversationFlowController.handleUserInput()).rejects.toThrow('Conversation not active or paused');
    });
  });

  describe('Conversation History', () => {
    beforeEach(async () => {
      await conversationFlowController.startConversation();
    });

    it('should maintain conversation history', async () => {
      await conversationFlowController.handleUserInput();
      await conversationFlowController.finishUserInput();
      
      const history = conversationFlowController.getConversationHistory();
      
      expect(history).toHaveLength(3);
      expect(history[0].role).toBe('assistant'); // Greeting
      expect(history[1].role).toBe('user');
      expect(history[2].role).toBe('assistant');
      
      // Check message structure
      expect(history[0]).toMatchObject({
        id: expect.any(String),
        role: 'assistant',
        content: expect.any(String),
        timestamp: expect.any(Date),
      });
    });

    it('should update conversation context with history', async () => {
      await conversationFlowController.handleUserInput();
      await conversationFlowController.finishUserInput();
      
      const context = conversationFlowController.getCurrentContext();
      expect(context?.conversationHistory).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle conversation service errors', async () => {
      const mockErrorHandler = jest.fn();
      
      // Create new controller with custom error handler
      const testController = new DefaultConversationFlowController(
        mockConversationService,
        mockErrorHandler
      );
      
      const apiError: ConversationError = {
        type: 'api',
        message: 'ChatGPT API failed',
        recoverable: true,
      };
      
      // Reset the mock to avoid interference from previous calls
      mockConversationService.sendMessageToChatGPT.mockReset();
      mockConversationService.sendMessageToChatGPT
        .mockResolvedValueOnce('Hello! How are you today?') // For greeting
        .mockRejectedValueOnce(apiError); // For user input
      
      await testController.startConversation();
      await testController.handleUserInput();
      
      try {
        await testController.finishUserInput();
      } catch (error) {
        // Error should be handled
      }
      
      expect(mockErrorHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'api',
        message: expect.stringContaining('ChatGPT API failed'),
      }));
    });

    it('should handle recording errors during input', async () => {
      await conversationFlowController.startConversation();
      
      const recordingError: ConversationError = {
        type: 'audio',
        message: 'Recording failed',
        recoverable: true,
      };
      
      mockConversationService.stopListening.mockRejectedValue(recordingError);
      
      await conversationFlowController.handleUserInput();
      
      await expect(conversationFlowController.finishUserInput()).rejects.toMatchObject({
        type: 'audio',
        message: 'Recording failed',
      });
      
      expect(conversationFlowController.isRecording()).toBe(false);
    });
  });

  describe('Continuous Recording', () => {
    beforeEach(async () => {
      await conversationFlowController.startConversation();
    });

    it('should support continuous recording pattern', async () => {
      // Start continuous recording (press and hold)
      await conversationFlowController.startContinuousRecording();
      expect(conversationFlowController.isRecording()).toBe(true);
      
      // Stop continuous recording (release)
      await conversationFlowController.stopContinuousRecording();
      expect(conversationFlowController.isRecording()).toBe(false);
      
      const history = conversationFlowController.getConversationHistory();
      expect(history.length).toBeGreaterThan(1); // Should have processed the input
    });
  });

  describe('Multi-language Support', () => {
    it('should handle different target languages', async () => {
      const frenchProfile = { ...mockProfile, targetLanguage: 'french' };
      (profileService.getProfile as jest.Mock).mockResolvedValue({
        profile: frenchProfile,
        error: null,
      });
      
      await conversationFlowController.startConversation();
      
      const context = conversationFlowController.getCurrentContext();
      expect(context?.targetLanguage).toBe('french');
      
      expect(mockConversationService.speakText).toHaveBeenCalledWith(
        expect.any(String),
        'french'
      );
    });

    it('should handle different CEFR levels', async () => {
      const advancedProfile = { ...mockProfile, cefrLevel: 'C1' };
      (profileService.getProfile as jest.Mock).mockResolvedValue({
        profile: advancedProfile,
        error: null,
      });
      
      await conversationFlowController.startConversation();
      
      const context = conversationFlowController.getCurrentContext();
      expect(context?.cefrLevel).toBe('C1');
    });
  });
});