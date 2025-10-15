import { ElevenLabsServiceImpl, ElevenLabsVoice } from '../services/elevenLabsService';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
    env: {},
  },
  manifest: {
    extra: {},
  },
}));

// Mock dependencies with explicit factories to avoid Expo ESM issues
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file://cache/',
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(),
    },
  },
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ElevenLabsServiceImpl', () => {
  let service: ElevenLabsServiceImpl;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new ElevenLabsServiceImpl(mockApiKey);
    jest.clearAllMocks();
    
    // Setup default mocks
    mockAudio.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockAudio.setAudioModeAsync.mockResolvedValue();
    mockFileSystem.cacheDirectory = 'file://cache/';
    mockFileSystem.writeAsStringAsync.mockResolvedValue();
    mockFileSystem.deleteAsync.mockResolvedValue();
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 1024 } as any);
  });

  describe('getVoices', () => {
    const mockVoicesResponse = {
      voices: [
        {
          voice_id: 'voice1',
          name: 'Rachel',
          labels: { language: 'en', gender: 'female' },
          description: 'American English voice'
        },
        {
          voice_id: 'voice2',
          name: 'Antoni',
          labels: { language: 'es', gender: 'male' },
          description: 'Spanish voice'
        }
      ]
    };

    it('should fetch and cache voices successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVoicesResponse)
      } as Response);

      const voices = await service.getVoices();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/voices',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'xi-api-key': mockApiKey,
            'Content-Type': 'application/json'
          }
        })
      );

      expect(voices).toHaveLength(2);
      expect(voices[0]).toEqual({
        voice_id: 'voice1',
        name: 'Rachel',
        language: 'en',
        gender: 'female',
        description: 'American English voice',
        verified_languages: undefined,
        labels: { language: 'en', gender: 'female' }
      });
    });

    it('should return cached voices on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVoicesResponse)
      } as Response);

      // First call
      await service.getVoices();
      
      // Second call should use cache
      const voices = await service.getVoices();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(voices).toHaveLength(2);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      } as Response);

      await expect(service.getVoices()).rejects.toThrow('ElevenLabs API error: 401 - Unauthorized');
    });
  });

  describe('speakText', () => {
    const mockAudioBuffer = new ArrayBuffer(8);
    const mockSound = {
      playAsync: jest.fn().mockResolvedValue(undefined),
      setOnPlaybackStatusUpdate: jest.fn(),
      unloadAsync: jest.fn().mockResolvedValue(undefined)
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockAudioBuffer)
      } as Response);

      mockAudio.Sound.createAsync.mockResolvedValue({
        sound: mockSound
      } as any);

      // Mock successful playback
      mockSound.setOnPlaybackStatusUpdate.mockImplementation((callback) => {
        setTimeout(() => {
          callback({ isLoaded: true, didJustFinish: true });
        }, 100);
      });
    });

    it('should generate and play speech successfully', async () => {
      const text = 'Hello world';
      const voiceId = 'voice1';
      const language = 'english';

      await service.speakText(text, voiceId, language);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'xi-api-key': mockApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.5
            },
            speech_speed: 1.0
          })
        })
      );

      expect(mockAudio.Sound.createAsync).toHaveBeenCalledWith(
        { uri: expect.any(String) },
        expect.objectContaining({
          rate: 1.0,
          shouldCorrectPitch: true,
        })
      );

      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(mockSound.playAsync).toHaveBeenCalled();
    });

    it('should use cached audio when available', async () => {
      const text = 'Hello world';
      const voiceId = 'voice1';
      const language = 'english';

      // First call - should generate audio
      await service.speakText(text, voiceId, language);
      
      // Second call - should use cache
      await service.speakText(text, voiceId, language);

      // Should only call API once
      expect(mockFetch).toHaveBeenCalledTimes(1);
      // But should create sound twice
      expect(mockAudio.Sound.createAsync).toHaveBeenCalledTimes(2);
    });

    it('should clamp speed to valid range', async () => {
      const text = 'Hello world';
      const voiceId = 'voice1';
      const language = 'english';
      const invalidSpeed = 2.0; // Above max of 1.2

      await service.speakText(text, voiceId, language, true, invalidSpeed);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.5
            },
            speech_speed: 1.2 // Should be clamped
          })
        })
      );

      expect(mockAudio.Sound.createAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          rate: expect.any(Number),
          shouldCorrectPitch: true,
        })
      );
    });

    it('should handle TTS API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const text = 'Hello world';
      const voiceId = 'voice1';
      const language = 'english';

      await expect(service.speakText(text, voiceId, language)).rejects.toThrow('ElevenLabs TTS API error: 500');
    });
  });

  describe('previewVoice', () => {
    it('should preview voice with default text', async () => {
      const speakTextSpy = jest.spyOn(service, 'speakText').mockResolvedValue();
      
      await service.previewVoice('voice1', '', 'english');

      expect(speakTextSpy).toHaveBeenCalledWith(
        'Hello! This is a preview of my voice. How do I sound?',
        'voice1',
        'english',
        true,
        1.0,
        'neutral',
        0.6,
        0.5
      );

      speakTextSpy.mockRestore();
    });

    it('should preview voice with custom text', async () => {
      const speakTextSpy = jest.spyOn(service, 'speakText').mockResolvedValue();
      const customText = 'Custom preview text';
      
      await service.previewVoice('voice1', customText, 'english');

      expect(speakTextSpy).toHaveBeenCalledWith(
        customText,
        'voice1',
        'english',
        true,
        1.0,
        'neutral',
        0.6,
        0.5
      );

      speakTextSpy.mockRestore();
    });
  });

  describe('preloadCommonPhrases', () => {
    it('should preload phrases for given language and level', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      } as Response);

      const getDefaultVoiceSpy = jest.spyOn(service, 'getDefaultVoiceForLanguage')
        .mockResolvedValue('voice1');

      await service.preloadCommonPhrases('english', 'A1');

      expect(getDefaultVoiceSpy).toHaveBeenCalledWith('english');
      expect(mockFetch).toHaveBeenCalledTimes(5); // 5 common phrases for A1
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledTimes(5);

      getDefaultVoiceSpy.mockRestore();
    });

    it('should handle preload errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const getDefaultVoiceSpy = jest.spyOn(service, 'getDefaultVoiceForLanguage')
        .mockResolvedValue('voice1');

      // Should not throw, but log warnings
      await expect(service.preloadCommonPhrases('english', 'A1')).resolves.not.toThrow();

      getDefaultVoiceSpy.mockRestore();
    });
  });

  describe('clearAudioCache', () => {
    it('should clear all cached files', async () => {
      // First, add some items to cache by calling speakText
      const mockAudioBuffer = new ArrayBuffer(8);
      const mockSound = {
        playAsync: jest.fn().mockResolvedValue(undefined),
        setOnPlaybackStatusUpdate: jest.fn((callback) => {
          setTimeout(() => callback({ isLoaded: true, didJustFinish: true }), 10);
        }),
        unloadAsync: jest.fn().mockResolvedValue(undefined)
      };

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockAudioBuffer)
      } as Response);

      mockAudio.Sound.createAsync.mockResolvedValue({
        sound: mockSound
      } as any);

      // Add some cached items
      await service.speakText('Hello', 'voice1', 'english');
      await service.speakText('World', 'voice1', 'english');

      // Clear cache
      await service.clearAudioCache();

      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheSize', () => {
    it('should calculate total cache size', async () => {
      // Mock file info for cached files
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true, size: 1024 } as any)
        .mockResolvedValueOnce({ exists: true, size: 2048 } as any);

      // Add some cached items first
      const mockAudioBuffer = new ArrayBuffer(8);
      const mockSound = {
        playAsync: jest.fn().mockResolvedValue(undefined),
        setOnPlaybackStatusUpdate: jest.fn((callback) => {
          setTimeout(() => callback({ isLoaded: true, didJustFinish: true }), 10);
        }),
        unloadAsync: jest.fn().mockResolvedValue(undefined)
      };

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockAudioBuffer)
      } as Response);

      mockAudio.Sound.createAsync.mockResolvedValue({
        sound: mockSound
      } as any);

      await service.speakText('Hello', 'voice1', 'english');
      await service.speakText('World', 'voice1', 'english');

      const cacheSize = await service.getCacheSize();

      expect(cacheSize).toBe(3072); // 1024 + 2048
    });
  });

  describe('getServiceStatus', () => {
    it('should return available status when service is working', async () => {
      const getVoicesSpy = jest.spyOn(service, 'getVoices').mockResolvedValue([]);

      const status = await service.getServiceStatus();

      expect(status).toEqual({
        isAvailable: true,
        recommendedUsage: 'normal'
      });

      getVoicesSpy.mockRestore();
    });

    it('should return unavailable status when service fails', async () => {
      const getVoicesSpy = jest.spyOn(service, 'getVoices').mockRejectedValue(new Error('API Error'));

      const status = await service.getServiceStatus();

      expect(status).toEqual({
        isAvailable: false,
        recommendedUsage: 'minimal'
      });

      getVoicesSpy.mockRestore();
    });
  });

  describe('getVoicesForLanguage', () => {
    it('should filter voices by language', async () => {
      const mockVoices: ElevenLabsVoice[] = [
        {
          voice_id: 'voice1',
          name: 'Rachel',
          language: 'en',
          gender: 'female',
          description: 'English voice',
          verified_languages: [{ language: 'en', locale: 'en-US', accent: 'american', model_id: 'model1' }],
          labels: { language: 'en', gender: 'female' }
        },
        {
          voice_id: 'voice2',
          name: 'Antoni',
          language: 'es',
          gender: 'male',
          description: 'Spanish voice',
          verified_languages: [{ language: 'es', locale: 'es-ES', accent: 'spanish', model_id: 'model2' }],
          labels: { language: 'es', gender: 'male' }
        }
      ];

      const getVoicesSpy = jest.spyOn(service, 'getVoices').mockResolvedValue(mockVoices);

      const englishVoices = await service.getVoicesForLanguage('english');
      const spanishVoices = await service.getVoicesForLanguage('spanish');

      expect(englishVoices).toHaveLength(1);
      expect(englishVoices[0].name).toBe('Rachel');
      
      expect(spanishVoices).toHaveLength(1);
      expect(spanishVoices[0].name).toBe('Antoni');

      getVoicesSpy.mockRestore();
    });

    it('should return all voices as fallback when no language-specific voices found', async () => {
      const mockVoices: ElevenLabsVoice[] = [
        {
          voice_id: 'voice1',
          name: 'Rachel',
          language: 'en',
          gender: 'female',
          description: 'English voice',
          verified_languages: [],
          labels: { language: 'en', gender: 'female' }
        }
      ];

      const getVoicesSpy = jest.spyOn(service, 'getVoices').mockResolvedValue(mockVoices);

      const chineseVoices = await service.getVoicesForLanguage('chinese');

      expect(chineseVoices).toHaveLength(1); // Should return all voices as fallback
      expect(chineseVoices[0].name).toBe('Rachel');

      getVoicesSpy.mockRestore();
    });
  });
});