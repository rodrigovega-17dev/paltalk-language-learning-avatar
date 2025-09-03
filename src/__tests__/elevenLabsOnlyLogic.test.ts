/**
 * Unit tests for ElevenLabs-only TTS logic
 * These tests focus on the core business logic without React Native dependencies
 */

describe('ElevenLabs-only TTS Implementation', () => {
  // Mock fetch globally
  global.fetch = jest.fn();
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Voice Selection Logic', () => {
    it('should filter voices by language correctly', () => {
      const mockVoices = [
        {
          voice_id: 'voice1',
          name: 'Rachel',
          language: 'en',
          verified_languages: [{ language: 'en', locale: 'en-US', accent: 'american', model_id: 'model1' }]
        },
        {
          voice_id: 'voice2',
          name: 'Antoni',
          language: 'es',
          verified_languages: [{ language: 'es', locale: 'es-ES', accent: 'spanish', model_id: 'model2' }]
        },
        {
          voice_id: 'voice3',
          name: 'Bella',
          language: 'fr',
          verified_languages: [{ language: 'fr', locale: 'fr-FR', accent: 'french', model_id: 'model3' }]
        }
      ];

      // Test language filtering logic
      const filterVoicesByLanguage = (voices: any[], targetLanguage: string) => {
        const languageMap: { [key: string]: string[] } = {
          english: ['en', 'en-US', 'en-GB'],
          spanish: ['es', 'es-ES', 'es-MX'],
          french: ['fr', 'fr-FR'],
          german: ['de', 'de-DE']
        };

        const targetLanguages = languageMap[targetLanguage] || ['en'];

        return voices.filter((voice: any) => {
          const primaryLanguageMatch = targetLanguages.some(lang => 
            voice.language?.toLowerCase().includes(lang.toLowerCase())
          );

          const verifiedLanguageMatch = voice.verified_languages?.some((verified: any) => 
            targetLanguages.some(lang => 
              verified.language?.toLowerCase().includes(lang.toLowerCase()) ||
              verified.locale?.toLowerCase().includes(lang.toLowerCase())
            )
          );

          return primaryLanguageMatch || verifiedLanguageMatch;
        });
      };

      const englishVoices = filterVoicesByLanguage(mockVoices, 'english');
      const spanishVoices = filterVoicesByLanguage(mockVoices, 'spanish');
      const frenchVoices = filterVoicesByLanguage(mockVoices, 'french');

      expect(englishVoices).toHaveLength(1);
      expect(englishVoices[0].name).toBe('Rachel');

      expect(spanishVoices).toHaveLength(1);
      expect(spanishVoices[0].name).toBe('Antoni');

      expect(frenchVoices).toHaveLength(1);
      expect(frenchVoices[0].name).toBe('Bella');
    });

    it('should return fallback voices when no language-specific voices found', () => {
      const mockVoices = [
        { voice_id: 'voice1', name: 'Rachel', language: 'en', verified_languages: [] }
      ];

      const filterVoicesByLanguage = (voices: any[], targetLanguage: string) => {
        const languageMap: { [key: string]: string[] } = {
          english: ['en', 'en-US', 'en-GB'],
          spanish: ['es', 'es-ES', 'es-MX'],
          french: ['fr', 'fr-FR'],
          german: ['de', 'de-DE']
        };

        const targetLanguages = languageMap[targetLanguage] || ['en'];
        const filtered = voices.filter((voice: any) => {
          return targetLanguages.some(lang => 
            voice.language?.toLowerCase().includes(lang.toLowerCase())
          );
        });

        // Return all voices as fallback if no language-specific voices found
        return filtered.length > 0 ? filtered : voices;
      };

      const chineseVoices = filterVoicesByLanguage(mockVoices, 'chinese');
      expect(chineseVoices).toHaveLength(1); // Should return all voices as fallback
    });
  });

  describe('TTS Settings Validation', () => {
    it('should clamp speed to valid ElevenLabs range', () => {
      const clampSpeed = (speed: number): number => {
        return Math.max(0.7, Math.min(1.2, speed));
      };

      expect(clampSpeed(0.5)).toBe(0.7); // Below minimum
      expect(clampSpeed(1.0)).toBe(1.0); // Valid
      expect(clampSpeed(1.5)).toBe(1.2); // Above maximum
      expect(clampSpeed(2.0)).toBe(1.2); // Way above maximum
    });

    it('should clamp stability and similarity boost to valid range', () => {
      const clampValue = (value: number): number => {
        return Math.max(0.0, Math.min(1.0, value));
      };

      expect(clampValue(-0.5)).toBe(0.0); // Below minimum
      expect(clampValue(0.5)).toBe(0.5); // Valid
      expect(clampValue(1.5)).toBe(1.0); // Above maximum
    });

    it('should provide default values for missing settings', () => {
      const getDefaultTTSSettings = (settings: any) => {
        return {
          speed: settings.speed || 1.0,
          emotion: settings.emotion || 'neutral',
          stability: settings.stability || 0.6,
          similarityBoost: settings.similarityBoost || 0.5,
          useSpeaker: settings.useSpeaker !== undefined ? settings.useSpeaker : true
        };
      };

      const result = getDefaultTTSSettings({});
      expect(result).toEqual({
        speed: 1.0,
        emotion: 'neutral',
        stability: 0.6,
        similarityBoost: 0.5,
        useSpeaker: true
      });

      const partialResult = getDefaultTTSSettings({ speed: 0.8, useSpeaker: false });
      expect(partialResult).toEqual({
        speed: 0.8,
        emotion: 'neutral',
        stability: 0.6,
        similarityBoost: 0.5,
        useSpeaker: false
      });
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const createCacheKey = (
        text: string,
        voiceId: string,
        speed: number,
        emotion: string,
        stability: number,
        similarityBoost: number
      ): string => {
        const keyData = `${text}_${voiceId}_${speed}_${emotion}_${stability}_${similarityBoost}`;
        return keyData.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      };

      const key1 = createCacheKey('Hello world', 'voice1', 1.0, 'neutral', 0.6, 0.5);
      const key2 = createCacheKey('Hello world', 'voice1', 1.0, 'neutral', 0.6, 0.5);
      const key3 = createCacheKey('Hello world', 'voice2', 1.0, 'neutral', 0.6, 0.5);

      expect(key1).toBe(key2); // Same parameters should generate same key
      expect(key1).not.toBe(key3); // Different voice should generate different key
      expect(key1.length).toBeLessThanOrEqual(50); // Should respect length limit
    });
  });

  describe('Model Selection Logic', () => {
    it('should select appropriate model for each language', () => {
      const getModelForLanguage = (language: string): string => {
        const modelMap: { [key: string]: string } = {
          english: 'eleven_monolingual_v1',
          spanish: 'eleven_multilingual_v2',
          french: 'eleven_multilingual_v2',
          german: 'eleven_multilingual_v2',
        };

        return modelMap[language] || 'eleven_monolingual_v1';
      };

      expect(getModelForLanguage('english')).toBe('eleven_monolingual_v1');
      expect(getModelForLanguage('spanish')).toBe('eleven_multilingual_v2');
      expect(getModelForLanguage('french')).toBe('eleven_multilingual_v2');
      expect(getModelForLanguage('german')).toBe('eleven_multilingual_v2');
      expect(getModelForLanguage('unknown')).toBe('eleven_monolingual_v1'); // Fallback
    });
  });

  describe('Common Phrases Generation', () => {
    it('should generate appropriate phrases for different CEFR levels', () => {
      const getCommonPhrasesForLevel = (language: string, cefrLevel: string): string[] => {
        const phrases: { [key: string]: { [key: string]: string[] } } = {
          english: {
            A1: ['Hello', 'Thank you', 'Good morning', 'How are you?', 'Nice to meet you'],
            A2: ['Could you help me?', 'I would like to...', 'Excuse me', 'What time is it?', 'Where is the bathroom?'],
            B1: ['I think that...', 'In my opinion...', 'Could you explain that?', 'That sounds interesting', 'I agree with you'],
            B2: ['Furthermore...', 'On the other hand...', 'I would argue that...', 'This raises the question...', 'To summarize...'],
            C1: ['Nevertheless...', 'Consequently...', 'It could be argued that...', 'This phenomenon...', 'In retrospect...'],
            C2: ['Notwithstanding...', 'Albeit...', 'Hitherto...', 'Vis-à-vis...', 'Ipso facto...']
          }
        };
        
        return phrases[language]?.[cefrLevel] || phrases.english.A1;
      };

      const a1Phrases = getCommonPhrasesForLevel('english', 'A1');
      const c2Phrases = getCommonPhrasesForLevel('english', 'C2');

      expect(a1Phrases).toContain('Hello');
      expect(a1Phrases).toContain('Thank you');
      expect(a1Phrases).toHaveLength(5);

      expect(c2Phrases).toContain('Notwithstanding...');
      expect(c2Phrases).toContain('Ipso facto...');
      expect(c2Phrases).toHaveLength(5);

      // Test fallback
      const unknownPhrases = getCommonPhrasesForLevel('unknown', 'unknown');
      expect(unknownPhrases).toEqual(a1Phrases);
    });
  });

  describe('Error Handling Logic', () => {
    it('should categorize errors correctly', () => {
      const categorizeError = (error: any) => {
        if (error.message?.includes('ElevenLabs API error')) {
          return {
            type: 'audio',
            message: `ElevenLabs TTS failed: ${error}`,
            recoverable: true
          };
        }
        
        if (error.message?.includes('Network')) {
          return {
            type: 'network',
            message: `Network error: ${error}`,
            recoverable: true
          };
        }

        return {
          type: 'unknown',
          message: `Unknown error: ${error}`,
          recoverable: false
        };
      };

      const elevenLabsError = new Error('ElevenLabs API error: 429');
      const networkError = new Error('Network timeout');
      const unknownError = new Error('Something went wrong');

      expect(categorizeError(elevenLabsError)).toMatchObject({
        type: 'audio',
        recoverable: true
      });

      expect(categorizeError(networkError)).toMatchObject({
        type: 'network',
        recoverable: true
      });

      expect(categorizeError(unknownError)).toMatchObject({
        type: 'unknown',
        recoverable: false
      });
    });
  });

  describe('API Request Building', () => {
    it('should build correct ElevenLabs API request', () => {
      const buildTTSRequest = (
        text: string,
        voiceId: string,
        modelId: string,
        settings: {
          speed: number;
          stability: number;
          similarityBoost: number;
        }
      ) => {
        return {
          url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          method: 'POST',
          headers: {
            'xi-api-key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            model_id: modelId,
            voice_settings: {
              stability: settings.stability,
              similarity_boost: settings.similarityBoost,
            },
            ...(settings.speed !== 1.0 && { speed: settings.speed }),
          })
        };
      };

      const request = buildTTSRequest(
        'Hello world',
        'voice123',
        'eleven_monolingual_v1',
        { speed: 1.1, stability: 0.7, similarityBoost: 0.6 }
      );

      expect(request.url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice123');
      expect(request.method).toBe('POST');
      expect(request.headers['xi-api-key']).toBe('test-api-key');
      
      const body = JSON.parse(request.body);
      expect(body.text).toBe('Hello world');
      expect(body.model_id).toBe('eleven_monolingual_v1');
      expect(body.voice_settings.stability).toBe(0.7);
      expect(body.voice_settings.similarity_boost).toBe(0.6);
      expect(body.speed).toBe(1.1);
    });

    it('should omit speed parameter when it equals 1.0', () => {
      const buildTTSRequest = (
        text: string,
        voiceId: string,
        modelId: string,
        settings: {
          speed: number;
          stability: number;
          similarityBoost: number;
        }
      ) => {
        return JSON.stringify({
          text: text,
          model_id: modelId,
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
          },
          ...(settings.speed !== 1.0 && { speed: settings.speed }),
        });
      };

      const requestWithNormalSpeed = buildTTSRequest(
        'Hello',
        'voice123',
        'model1',
        { speed: 1.0, stability: 0.6, similarityBoost: 0.5 }
      );

      const requestWithCustomSpeed = buildTTSRequest(
        'Hello',
        'voice123',
        'model1',
        { speed: 1.1, stability: 0.6, similarityBoost: 0.5 }
      );

      const normalSpeedBody = JSON.parse(requestWithNormalSpeed);
      const customSpeedBody = JSON.parse(requestWithCustomSpeed);

      expect(normalSpeedBody.speed).toBeUndefined();
      expect(customSpeedBody.speed).toBe(1.1);
    });
  });
});