import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ConversationScreen } from '../components/ConversationScreen';
import { conversationFlowController } from '../services/conversationFlowController';
import { ConversationError } from '../services/conversationService';

// Mock the conversation flow controller
jest.mock('../services/conversationFlowController', () => ({
  conversationFlowController: {
    startConversation: jest.fn(),
    handleUserInput: jest.fn(),
    finishUserInput: jest.fn(),
    pauseConversation: jest.fn(),
    resumeConversation: jest.fn(),
    endConversation: jest.fn(),
    getConversationHistory: jest.fn(),
    isRecording: jest.fn(),
    isPaused: jest.fn(),
    isActive: jest.fn(),
  },
}));

// Mock the avatar container
jest.mock('../components/AvatarContainer', () => {
  const mockReact = require('react');
  return {
    AvatarContainer: mockReact.forwardRef(({ onAnimationChange, style }: any, ref: any) => {
      const MockedAvatarContainer = () => mockReact.createElement('View', { testID: 'avatar-container', style });
      return mockReact.createElement(MockedAvatarContainer);
    }),
    useAvatarController: () => ({
      playIdleAnimation: jest.fn(),
      playListeningAnimation: jest.fn(),
      playTalkingAnimation: jest.fn(),
      playThinkingAnimation: jest.fn(),
      stopAllAnimations: jest.fn(),
      setAnimationSpeed: jest.fn(),
    }),
  };
});

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ConversationScreen', () => {
  const mockConversationFlowController = conversationFlowController as jest.Mocked<typeof conversationFlowController>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConversationFlowController.getConversationHistory.mockReturnValue([]);
    mockConversationFlowController.isRecording.mockReturnValue(false);
    mockConversationFlowController.isPaused.mockReturnValue(false);
    mockConversationFlowController.isActive.mockReturnValue(false);
  });

  describe('Initial Render', () => {
    it('should render the main conversation interface', () => {
      const { getByTestId, getByText } = render(<ConversationScreen />);
      
      expect(getByTestId('avatar-container')).toBeTruthy();
      expect(getByText('Start Conversation')).toBeTruthy();
      expect(getByText('Show Text')).toBeTruthy();
    });

    it('should not show record button initially', () => {
      const { queryByText } = render(<ConversationScreen />);
      
      expect(queryByText('🎤 Hold to Talk')).toBeNull();
      expect(queryByText('🎤 Recording...')).toBeNull();
    });
  });

  describe('Conversation Controls', () => {
    it('should start conversation when start button is pressed', async () => {
      mockConversationFlowController.startConversation.mockResolvedValue();
      
      const { getByText } = render(<ConversationScreen />);
      const startButton = getByText('Start Conversation');
      
      await act(async () => {
        fireEvent.press(startButton);
      });
      
      expect(mockConversationFlowController.startConversation).toHaveBeenCalled();
    });

    it('should show pause and end buttons when conversation is active', async () => {
      mockConversationFlowController.startConversation.mockResolvedValue();
      
      const { getByText, rerender } = render(<ConversationScreen />);
      
      await act(async () => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      // Re-render to reflect state change
      rerender(<ConversationScreen />);
      
      await waitFor(() => {
        expect(getByText('Pause')).toBeTruthy();
        expect(getByText('End')).toBeTruthy();
      });
    });

    it('should pause conversation when pause button is pressed', async () => {
      mockConversationFlowController.startConversation.mockResolvedValue();
      
      const { getByText, rerender } = render(<ConversationScreen />);
      
      // Start conversation first
      await act(async () => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      rerender(<ConversationScreen />);
      
      await waitFor(() => {
        const pauseButton = getByText('Pause');
        fireEvent.press(pauseButton);
      });
      
      expect(mockConversationFlowController.pauseConversation).toHaveBeenCalled();
    });

    it('should end conversation when end button is pressed', async () => {
      mockConversationFlowController.startConversation.mockResolvedValue();
      
      const { getByText, rerender } = render(<ConversationScreen />);
      
      // Start conversation first
      await act(async () => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      rerender(<ConversationScreen />);
      
      await waitFor(() => {
        const endButton = getByText('End');
        fireEvent.press(endButton);
      });
      
      expect(mockConversationFlowController.endConversation).toHaveBeenCalled();
    });
  });

  describe('Record Button Interactions', () => {
    beforeEach(async () => {
      mockConversationFlowController.startConversation.mockResolvedValue();
      mockConversationFlowController.handleUserInput.mockResolvedValue();
      mockConversationFlowController.finishUserInput.mockResolvedValue();
    });

    it('should show record button when conversation is active', async () => {
      const { getByText, rerender } = render(<ConversationScreen />);
      
      await act(async () => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      rerender(<ConversationScreen />);
      
      await waitFor(() => {
        expect(getByText('🎤 Hold to Talk')).toBeTruthy();
      });
    });

    it('should start recording on press in', async () => {
      const { getByText, rerender } = render(<ConversationScreen />);
      
      await act(async () => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      rerender(<ConversationScreen />);
      
      await waitFor(async () => {
        const recordButton = getByText('🎤 Hold to Talk');
        await act(async () => {
          fireEvent(recordButton, 'pressIn');
        });
      });
      
      expect(mockConversationFlowController.handleUserInput).toHaveBeenCalled();
    });

    it('should stop recording on press out', async () => {
      const { getByText, rerender } = render(<ConversationScreen />);
      
      await act(async () => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      rerender(<ConversationScreen />);
      
      await waitFor(async () => {
        const recordButton = getByText('🎤 Hold to Talk');
        
        await act(async () => {
          fireEvent(recordButton, 'pressIn');
        });
        
        await act(async () => {
          fireEvent(recordButton, 'pressOut');
        });
      });
      
      expect(mockConversationFlowController.finishUserInput).toHaveBeenCalled();
    });
  });

  describe('Text Display Toggle', () => {
    it('should toggle text display when toggle button is pressed', () => {
      const { getByText } = render(<ConversationScreen />);
      const toggleButton = getByText('Show Text');
      
      fireEvent.press(toggleButton);
      
      expect(getByText('Hide Text')).toBeTruthy();
    });

    it('should show text overlay when text display is enabled', () => {
      const { getByText, queryByTestId, getByTestId } = render(<ConversationScreen />);
      
      // Initially, text overlay should not be visible
      expect(queryByTestId('text-overlay')).toBeNull();
      
      // Toggle text display on
      fireEvent.press(getByText('Show Text'));
      
      // Text overlay should now be visible
      expect(getByTestId('text-overlay')).toBeTruthy();
      expect(getByText('Hide Text')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should show error alert for permission errors', async () => {
      const permissionError: ConversationError = {
        type: 'permission',
        message: 'Microphone permission required',
        recoverable: true,
      };
      
      mockConversationFlowController.startConversation.mockRejectedValue(permissionError);
      
      const { getByText } = render(<ConversationScreen />);
      
      await act(async () => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Microphone Permission Required',
        'Please allow microphone access to use voice features.',
        [{ text: 'OK', onPress: expect.any(Function) }]
      );
    });

    it('should show error alert for network errors', async () => {
      const networkError: ConversationError = {
        type: 'network',
        message: 'Network connection failed',
        recoverable: true,
      };
      
      mockConversationFlowController.startConversation.mockRejectedValue(networkError);
      
      const { getByText } = render(<ConversationScreen />);
      
      await act(async () => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Network Error',
        'Please check your internet connection and try again.',
        [{ text: 'OK', onPress: expect.any(Function) }]
      );
    });

    it('should show error alert for API errors', async () => {
      const apiError: ConversationError = {
        type: 'api',
        message: 'API service failed',
        recoverable: true,
      };
      
      mockConversationFlowController.startConversation.mockRejectedValue(apiError);
      
      const { getByText } = render(<ConversationScreen />);
      
      await act(async () => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Service Error',
        'There was an issue with the language service. Please try again.',
        [{ text: 'OK', onPress: expect.any(Function) }]
      );
    });
  });

  describe('Settings Navigation', () => {
    it('should call onNavigateToSettings when settings button is pressed', () => {
      const mockNavigateToSettings = jest.fn();
      const { getByText } = render(
        <ConversationScreen onNavigateToSettings={mockNavigateToSettings} />
      );
      
      const settingsButton = getByText('Settings');
      fireEvent.press(settingsButton);
      
      expect(mockNavigateToSettings).toHaveBeenCalled();
    });

    it('should not show settings button when onNavigateToSettings is not provided', () => {
      const { queryByText } = render(<ConversationScreen />);
      
      expect(queryByText('Settings')).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when starting conversation', async () => {
      mockConversationFlowController.startConversation.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const { getByText } = render(<ConversationScreen />);
      
      act(() => {
        fireEvent.press(getByText('Start Conversation'));
      });
      
      expect(getByText('Starting...')).toBeTruthy();
    });
  });

  describe('Responsive Layout', () => {
    it('should render avatar container and controls section', () => {
      const { getByTestId, getByText } = render(<ConversationScreen />);
      
      // Avatar section should be present
      expect(getByTestId('avatar-container')).toBeTruthy();
      
      // Controls section should be present
      expect(getByText('Start Conversation')).toBeTruthy();
      expect(getByText('Show Text')).toBeTruthy();
    });
  });
});