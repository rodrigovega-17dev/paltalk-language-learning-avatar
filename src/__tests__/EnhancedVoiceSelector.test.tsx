import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { EnhancedVoiceSelector } from '../components/EnhancedVoiceSelector';
import { elevenLabsService, ElevenLabsVoice } from '../services/elevenLabsService';

// Mock dependencies
jest.mock('../services/elevenLabsService');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn()
  }
}));

const mockElevenLabsService = elevenLabsService as jest.Mocked<typeof elevenLabsService>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('EnhancedVoiceSelector', () => {
  const mockVoices: ElevenLabsVoice[] = [
    {
      voice_id: 'voice1',
      name: 'Rachel',
      language: 'en',
      gender: 'female',
      description: 'American English voice',
      verified_languages: [],
      labels: { language: 'en', gender: 'female' }
    },
    {
      voice_id: 'voice2',
      name: 'Josh',
      language: 'en',
      gender: 'male',
      description: 'British English voice',
      verified_languages: [],
      labels: { language: 'en', gender: 'male' }
    }
  ];

  const defaultProps = {
    language: 'english',
    onVoiceSelect: jest.fn(),
    onPreview: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockElevenLabsService.getVoicesForLanguage.mockResolvedValue(mockVoices);
  });

  it('should render loading state initially', () => {
    render(<EnhancedVoiceSelector {...defaultProps} />);
    
    expect(screen.getByText('Loading voices...')).toBeTruthy();
  });

  it('should load and display voices for the specified language', async () => {
    render(<EnhancedVoiceSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Select Voice for english')).toBeTruthy();
      expect(screen.getByText('2 voices available')).toBeTruthy();
      expect(screen.getByText('Rachel')).toBeTruthy();
      expect(screen.getByText('Josh')).toBeTruthy();
    });

    expect(mockElevenLabsService.getVoicesForLanguage).toHaveBeenCalledWith('english');
  });

  it('should display voice details correctly', async () => {
    render(<EnhancedVoiceSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Rachel')).toBeTruthy();
      expect(screen.getByText('en • female')).toBeTruthy();
      expect(screen.getByText('American English voice')).toBeTruthy();
      
      expect(screen.getByText('Josh')).toBeTruthy();
      expect(screen.getByText('en • male')).toBeTruthy();
      expect(screen.getByText('British English voice')).toBeTruthy();
    });
  });

  it('should highlight selected voice', async () => {
    render(<EnhancedVoiceSelector {...defaultProps} selectedVoiceId="voice1" />);

    await waitFor(() => {
      const rachelVoice = screen.getByText('Rachel');
      expect(rachelVoice).toBeTruthy();
      // The selected voice should have different styling (tested through testID or style props)
    });
  });

  it('should call onVoiceSelect when a voice is selected', async () => {
    const onVoiceSelect = jest.fn();
    render(<EnhancedVoiceSelector {...defaultProps} onVoiceSelect={onVoiceSelect} />);

    await waitFor(() => {
      const rachelVoice = screen.getByText('Rachel');
      fireEvent.press(rachelVoice);
    });

    expect(onVoiceSelect).toHaveBeenCalledWith('voice1', 'Rachel');
  });

  it('should preview voice when preview button is pressed', async () => {
    const onPreview = jest.fn();
    render(<EnhancedVoiceSelector {...defaultProps} onPreview={onPreview} />);

    await waitFor(() => {
      const previewButtons = screen.getAllByText('Preview');
      fireEvent.press(previewButtons[0]);
    });

    expect(onPreview).toHaveBeenCalledWith('voice1');
  });

  it('should use default preview behavior when onPreview is not provided', async () => {
    mockElevenLabsService.previewVoice.mockResolvedValue();
    
    render(<EnhancedVoiceSelector language="english" onVoiceSelect={jest.fn()} />);

    await waitFor(() => {
      const previewButtons = screen.getAllByText('Preview');
      fireEvent.press(previewButtons[0]);
    });

    await waitFor(() => {
      expect(mockElevenLabsService.previewVoice).toHaveBeenCalledWith('voice1', '', 'english');
    });
  });

  it('should show loading indicator during preview', async () => {
    mockElevenLabsService.previewVoice.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<EnhancedVoiceSelector language="english" onVoiceSelect={jest.fn()} />);

    await waitFor(() => {
      const previewButtons = screen.getAllByText('Preview');
      fireEvent.press(previewButtons[0]);
    });

    // Should show loading indicator instead of "Preview" text
    await waitFor(() => {
      expect(screen.queryByText('Preview')).toBeFalsy();
    });
  });

  it('should prevent multiple simultaneous previews', async () => {
    mockElevenLabsService.previewVoice.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<EnhancedVoiceSelector language="english" onVoiceSelect={jest.fn()} />);

    await waitFor(() => {
      const previewButtons = screen.getAllByText('Preview');
      fireEvent.press(previewButtons[0]);
      fireEvent.press(previewButtons[1]);
    });

    expect(mockAlert).toHaveBeenCalledWith('Preview in Progress', 'Please wait for the current preview to finish.');
  });

  it('should handle preview errors gracefully', async () => {
    mockElevenLabsService.previewVoice.mockRejectedValue(new Error('Network error'));
    
    render(<EnhancedVoiceSelector language="english" onVoiceSelect={jest.fn()} />);

    await waitFor(() => {
      const previewButtons = screen.getAllByText('Preview');
      fireEvent.press(previewButtons[0]);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Preview Failed',
        'Could not preview Rachel. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    });
  });

  it('should hide preview buttons when showPreview is false', async () => {
    render(<EnhancedVoiceSelector {...defaultProps} showPreview={false} />);

    await waitFor(() => {
      expect(screen.getByText('Rachel')).toBeTruthy();
      expect(screen.queryByText('Preview')).toBeFalsy();
    });
  });

  it('should display error message when no voices are available', async () => {
    mockElevenLabsService.getVoicesForLanguage.mockResolvedValue([]);
    
    render(<EnhancedVoiceSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No voices available for english. Please check your ElevenLabs subscription.')).toBeTruthy();
    });
  });

  it('should display error message when voice loading fails', async () => {
    mockElevenLabsService.getVoicesForLanguage.mockRejectedValue(new Error('API Error'));
    
    render(<EnhancedVoiceSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load voices. Please check your internet connection and ElevenLabs API key.')).toBeTruthy();
    });
  });

  it('should allow retrying when voice loading fails', async () => {
    mockElevenLabsService.getVoicesForLanguage
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockVoices);
    
    render(<EnhancedVoiceSelector {...defaultProps} />);

    await waitFor(() => {
      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Rachel')).toBeTruthy();
      expect(screen.getByText('Josh')).toBeTruthy();
    });

    expect(mockElevenLabsService.getVoicesForLanguage).toHaveBeenCalledTimes(2);
  });

  it('should reload voices when language changes', async () => {
    const { rerender } = render(<EnhancedVoiceSelector {...defaultProps} language="english" />);

    await waitFor(() => {
      expect(mockElevenLabsService.getVoicesForLanguage).toHaveBeenCalledWith('english');
    });

    rerender(<EnhancedVoiceSelector {...defaultProps} language="spanish" />);

    await waitFor(() => {
      expect(mockElevenLabsService.getVoicesForLanguage).toHaveBeenCalledWith('spanish');
    });

    expect(mockElevenLabsService.getVoicesForLanguage).toHaveBeenCalledTimes(2);
  });

  it('should handle voices without description', async () => {
    const voicesWithoutDescription: ElevenLabsVoice[] = [
      {
        voice_id: 'voice1',
        name: 'Rachel',
        language: 'en',
        gender: 'female',
        description: undefined,
        verified_languages: [],
        labels: { language: 'en', gender: 'female' }
      }
    ];

    mockElevenLabsService.getVoicesForLanguage.mockResolvedValue(voicesWithoutDescription);
    
    render(<EnhancedVoiceSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Rachel')).toBeTruthy();
      expect(screen.getByText('en • female')).toBeTruthy();
      // Description should not be rendered
    });
  });

  it('should handle voices without gender', async () => {
    const voicesWithoutGender: ElevenLabsVoice[] = [
      {
        voice_id: 'voice1',
        name: 'Rachel',
        language: 'en',
        gender: undefined,
        description: 'Test voice',
        verified_languages: [],
        labels: { language: 'en' }
      }
    ];

    mockElevenLabsService.getVoicesForLanguage.mockResolvedValue(voicesWithoutGender);
    
    render(<EnhancedVoiceSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Rachel')).toBeTruthy();
      expect(screen.getByText('en • Unknown')).toBeTruthy();
    });
  });
});