import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { AudioEmotion, AudioTag } from '../types/conversation';
import { translationService } from './translationService';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  language: string;
  gender?: string;
  description?: string;
  description_es?: string;
  verified_languages?: Array<{
    language: string;
    locale: string;
    accent: string;
    model_id: string;
  }>;
  labels?: {
    language?: string;
    accent?: string;
    gender?: string;
  };
}

export interface ElevenLabsService {
  getVoices(): Promise<ElevenLabsVoice[]>;
  getVoicesForLanguage(language: string): Promise<ElevenLabsVoice[]>;
  speakText(text: string, voiceId: string, language: string, useSpeaker?: boolean, speed?: number, emotion?: AudioEmotion, stability?: number, similarityBoost?: number): Promise<void>;
  testLoudspeaker(voiceId: string, language: string, speed?: number, emotion?: AudioEmotion): Promise<void>;
  getDefaultVoiceForLanguage(language: string): Promise<string>;
  getVoiceInfo(voiceId: string): Promise<ElevenLabsVoice | null>;
  getModelForLanguage(language: string): string;
  getAudioTags(): AudioTag[];
  getAudioTagById(id: string): AudioTag | undefined;
  // Enhanced methods for voice selection and caching
  previewVoice(voiceId: string, sampleText: string, language: string): Promise<void>;
  preloadCommonPhrases(language: string, cefrLevel: string): Promise<void>;
  clearAudioCache(): Promise<void>;
  getCacheSize(): Promise<number>;
  getServiceStatus(): Promise<ElevenLabsStatus>;
}

export interface ElevenLabsStatus {
  isAvailable: boolean;
  quotaRemaining?: number;
  rateLimitReset?: Date;
  recommendedUsage: 'normal' | 'conservative' | 'minimal';
}

export class ElevenLabsServiceImpl implements ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private audioCache: Map<string, string> = new Map(); // Cache for audio files
  private voicesCache: ElevenLabsVoice[] | null = null;
  private voicesCacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Audio tag presets for different learning scenarios
  getAudioTags(): AudioTag[] {
    return [
      {
        id: 'beginner-slow',
        name: 'Beginner Slow',
        description: 'Clear, slow speech for beginners',
        speed: 0.7,
        emotion: 'friendly',
        stability: 0.8,
        similarityBoost: 0.7,
        icon: '🐌',
        useCase: 'New learners, complex vocabulary'
      },
      {
        id: 'conversational',
        name: 'Conversational',
        description: 'Natural conversation pace',
        speed: 1.0,
        emotion: 'neutral',
        stability: 0.6,
        similarityBoost: 0.5,
        icon: '💬',
        useCase: 'Daily conversation practice'
      },
      {
        id: 'excited-encouragement',
        name: 'Excited Encouragement',
        description: 'Energetic and motivating speech',
        speed: 1.1,
        emotion: 'excited',
        stability: 0.5,
        similarityBoost: 0.6,
        icon: '🎉',
        useCase: 'Celebrations, achievements'
      },
      {
        id: 'calm-instruction',
        name: 'Calm Instruction',
        description: 'Peaceful and clear instructions',
        speed: 0.9,
        emotion: 'calm',
        stability: 0.7,
        similarityBoost: 0.5,
        icon: '🧘',
        useCase: 'Grammar explanations, corrections'
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Formal and business-like',
        speed: 1.0,
        emotion: 'professional',
        stability: 0.8,
        similarityBoost: 0.6,
        icon: '👔',
        useCase: 'Business vocabulary, formal situations'
      },
      {
        id: 'friendly-help',
        name: 'Friendly Help',
        description: 'Warm and supportive guidance',
        speed: 0.8,
        emotion: 'friendly',
        stability: 0.6,
        similarityBoost: 0.5,
        icon: '🤝',
        useCase: 'Error correction, encouragement'
      },
      {
        id: 'fast-advanced',
        name: 'Fast Advanced',
        description: 'Quick speech for advanced learners',
        speed: 1.2,
        emotion: 'neutral',
        stability: 0.5,
        similarityBoost: 0.4,
        icon: '⚡',
        useCase: 'Advanced learners, native-like speed'
      },
      {
        id: 'storytelling',
        name: 'Storytelling',
        description: 'Engaging narrative voice',
        speed: 0.9,
        emotion: 'excited',
        stability: 0.6,
        similarityBoost: 0.5,
        icon: '📖',
        useCase: 'Stories, cultural content'
      }
    ];
  }

  getAudioTagById(id: string): AudioTag | undefined {
    return this.getAudioTags().find(tag => tag.id === id);
  }

  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.voicesCache && now < this.voicesCacheExpiry) {
        console.log('ElevenLabs: Returning cached voices');
        return this.voicesCache;
      }

      console.log(`ElevenLabs: Fetching voices with API key: ${this.apiKey.substring(0, 10)}...`);
      
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log(`ElevenLabs: API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs: API error response: ${errorText}`);
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`ElevenLabs: Received ${data.voices?.length || 0} voices from API`);
      
      if (data.voices && data.voices.length > 0) {
        console.log('ElevenLabs: Sample voice data:', data.voices[0]);
      }
      
      // Transform the API response to our interface format
      const transformedVoices = (data.voices || []).map((voice: any) => {
        const description = voice.description;
        const language = voice.labels?.language || voice.verified_languages?.[0]?.language || 'en';

        const baseVoice: ElevenLabsVoice = {
          voice_id: voice.voice_id,
          name: voice.name,
          language,
          gender: voice.labels?.gender,
          description,
          description_es: undefined,
          verified_languages: voice.verified_languages,
          labels: voice.labels,
        };

        if (language?.toLowerCase().startsWith('es')) {
          baseVoice.description_es = baseVoice.description;
        }

        return baseVoice;
      });
      
      // Cache the results
      this.voicesCache = transformedVoices;
      this.voicesCacheExpiry = now + this.CACHE_DURATION;
      
      console.log('ElevenLabs: Transformed and cached voices:', transformedVoices.slice(0, 2));
      
      return this.translateVoicesToSpanish(transformedVoices);
    } catch (error) {
      console.error('Failed to fetch ElevenLabs voices:', error);
      throw error;
    }
  }

  private async translateVoicesToSpanish(voices: ElevenLabsVoice[]): Promise<ElevenLabsVoice[]> {
    const voicesToTranslate = voices.filter((voice) => {
      if (!voice.description) {
        return false;
      }

      const language = voice.language?.toLowerCase() || 'en';
      const isSpanish = language.startsWith('es');

      if (isSpanish) {
        voice.description_es = voice.description;
        return false;
      }

      if (voice.description_es && typeof voice.description_es === 'string') {
        return false;
      }

      return true;
    });

    if (voicesToTranslate.length === 0) {
      return voices;
    }

    try {
      const translations = await Promise.all(
        voicesToTranslate.map((voice) =>
          translationService.translateMessage(voice.description as string, voice.language || 'en', 'spanish')
        )
      );

      translations.forEach((translation, index) => {
        voicesToTranslate[index].description_es = translation;
      });
    } catch (error) {
      console.warn('Failed to translate voice descriptions:', error);
    }

    return voices;
  }

  // Enhanced speakText method with emotion and voice parameters and caching
  async speakText(
    text: string,
    voiceId: string,
    language: string,
    useSpeaker: boolean = true,
    speed: number = 1.0,
    emotion: AudioEmotion = 'neutral',
    stability: number = 0.6,
    similarityBoost: number = 0.5,
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void
  ): Promise<void> {
    const clampedSpeed = Math.max(0.7, Math.min(1.2, speed));
    if (speed !== clampedSpeed) {
      console.log(`ElevenLabs: Requested speed ${speed} clamped to ${clampedSpeed}`);
    }

    const clampedStability = Math.max(0.0, Math.min(1.0, stability));
    const clampedSimilarityBoost = Math.max(0.0, Math.min(1.0, similarityBoost));

    try {
      await this.validateVoiceForLanguage(voiceId, language);
      await this.initializeAudio(useSpeaker);

      const cacheKey = this.createCacheKey(text, voiceId, clampedSpeed, emotion, clampedStability, clampedSimilarityBoost);
      let tempUri = this.audioCache.get(cacheKey);

      if (!tempUri || !(await FileSystem.getInfoAsync(tempUri)).exists) {
        const modelId = this.getModelForLanguage(language);
        const requestBody = {
          text,
          model_id: modelId,
          voice_settings: {
            stability: clampedStability,
            similarity_boost: clampedSimilarityBoost,
          },
          speech_speed: clampedSpeed,
        };

        console.log('ElevenLabs: Making TTS request with speed payload:', JSON.stringify(requestBody));

        const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs TTS API error: ${response.status}`);
        }

        tempUri = `${FileSystem.cacheDirectory}elevenlabs_${cacheKey}.mp3`;
        const audioArrayBuffer = await response.arrayBuffer();
        const audioBase64 = this.arrayBufferToBase64(audioArrayBuffer);

        await FileSystem.writeAsStringAsync(tempUri, audioBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        this.audioCache.set(cacheKey, tempUri);
        console.log(`ElevenLabs: Cached audio for key: ${cacheKey}`);
      } else {
        console.log(`ElevenLabs: Using cached audio for key: ${cacheKey}`);
      }

      const playbackRate = this.mapSpeedToPlaybackRate(clampedSpeed);

      const { sound } = await Audio.Sound.createAsync(
        { uri: tempUri },
        {
          shouldPlay: true,
          volume: useSpeaker ? 1.0 : 0.8,
          rate: playbackRate,
          shouldCorrectPitch: true,
        }
      );

      try {
        const pitchQuality = (Audio as any).PitchCorrectionQuality?.High ?? undefined;
        if (typeof sound.setRateAsync === 'function') {
          await sound.setRateAsync(playbackRate, true, pitchQuality);
        }
      } catch (rateError) {
        console.warn('ElevenLabs: Failed to apply playback rate locally:', rateError);
      }

      return new Promise<void>((resolve, reject) => {
        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish) {
            await sound.unloadAsync();
            onSpeechEnd?.();
            resolve();
          }
        });

        onSpeechStart?.();

        sound.playAsync().catch((error) => {
          console.error('ElevenLabs: Speech playback error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('ElevenLabs: Speech synthesis failed:', error);
      throw error;
    }
  }

  // Enhanced testLoudspeaker method with emotion support
  async testLoudspeaker(voiceId: string, language: string, speed: number = 1.0, emotion: AudioEmotion = 'neutral'): Promise<void> {
    // Clamp speed to reasonable text modification range (0.5 to 1.5)
    const clampedSpeed = Math.max(0.5, Math.min(1.5, speed));
    if (speed !== clampedSpeed) {
      console.log(`ElevenLabs: Test speed ${speed} clamped to supported range: ${clampedSpeed}`);
    }
    
    const testText = language === 'english' ? 'Testing loudspeaker output.' :
                    language === 'spanish' ? 'Probando salida de altavoz.' :
                    language === 'french' ? 'Test de sortie haut-parleur.' :
                    'Lautsprecher-Ausgang testen.';
    
    console.log(`ElevenLabs: Testing loudspeaker with voice ${voiceId} for ${language} at speed ${clampedSpeed} with emotion ${emotion}`);
    
    // Force loudspeaker mode multiple times before testing
    try {
      for (let i = 0; i < 3; i++) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false, // Force loudspeaker
          staysActiveInBackground: false,
        });
        console.log(`ElevenLabs: Forced loudspeaker mode (attempt ${i + 1})`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
    } catch (error) {
      console.log('ElevenLabs: Could not force loudspeaker mode before test');
    }
    
    await this.speakText(testText, voiceId, language, true, clampedSpeed, emotion); // Force loudspeaker with speed and emotion
  }

  private async validateVoiceForLanguage(voiceId: string, language: string): Promise<void> {
    try {
      // Get all voices to check the selected voice's language
      const allVoices = await this.getVoices();
      const selectedVoice = allVoices.find(voice => voice.voice_id === voiceId);
      
      if (!selectedVoice) {
        console.warn(`ElevenLabs: Voice ${voiceId} not found, proceeding anyway`);
        return;
      }
      
      // Map our language names to ElevenLabs language codes
      const languageMap: { [key: string]: string[] } = {
        english: ['en', 'en-US', 'en-GB'],
        spanish: ['es', 'es-ES', 'es-MX'],
        french: ['fr', 'fr-FR'],
        german: ['de', 'de-DE']
      };
      
      const targetLanguages = languageMap[language] || ['en'];
      const voiceLanguage = selectedVoice.language?.toLowerCase() || '';
      
      // Check primary language field
      const primaryLanguageMatch = targetLanguages.some(lang => 
        voiceLanguage.includes(lang.toLowerCase())
      );
      
      // Check verified_languages array
      const verifiedLanguageMatch = selectedVoice.verified_languages?.some(verified => 
        targetLanguages.some(lang => 
          verified.language?.toLowerCase().includes(lang.toLowerCase()) ||
          verified.locale?.toLowerCase().includes(lang.toLowerCase())
        )
      );
      
      const isCompatible = primaryLanguageMatch || verifiedLanguageMatch;
      
      if (!isCompatible) {
        console.warn(`ElevenLabs: Voice ${selectedVoice.name} (${selectedVoice.language}) may not be optimal for ${language}. Target languages: ${targetLanguages.join(', ')}`);
        
        // Try to find a better voice for this language
        const betterVoices = allVoices.filter((voice: ElevenLabsVoice) => 
          targetLanguages.some(lang => 
            voice.language?.toLowerCase().includes(lang.toLowerCase())
          )
        );
        
        if (betterVoices.length > 0) {
          console.log(`ElevenLabs: Found ${betterVoices.length} better voices for ${language}: ${betterVoices.map((v: ElevenLabsVoice) => v.name).join(', ')}`);
        }
      } else {
        console.log(`ElevenLabs: Voice ${selectedVoice.name} (${selectedVoice.language}) is compatible with ${language}`);
      }
    } catch (error) {
      console.error('ElevenLabs: Error validating voice for language:', error);
      // Don't throw error, just log it and continue
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async initializeAudio(useSpeaker: boolean = true): Promise<void> {
    try {
      await Audio.requestPermissionsAsync();
      console.log(`ElevenLabs: initializeAudio useSpeaker=${useSpeaker}`);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: useSpeaker ? false : true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: useSpeaker ? false : true,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('ElevenLabs: Audio initialization failed:', error);
      throw new Error('Failed to initialize audio permissions');
    }
  }

  async getVoicesForLanguage(language: string): Promise<ElevenLabsVoice[]> {
    try {
      const allVoices = await this.getVoices();
      console.log(`ElevenLabs: Total voices available: ${allVoices.length}`);
      
      // Map our language names to ElevenLabs language codes
      const languageMap: { [key: string]: string[] } = {
        english: ['en', 'en-US', 'en-GB'],
        spanish: ['es', 'es-ES', 'es-MX'],
        french: ['fr', 'fr-FR'],
        german: ['de', 'de-DE']
      };
      
      const targetLanguages = languageMap[language] || ['en'];
      console.log(`ElevenLabs: Looking for languages: ${targetLanguages.join(', ')}`);
      
      // Log all available voices and their languages for debugging
      console.log('ElevenLabs: All available voices:');
      allVoices.forEach((voice: ElevenLabsVoice) => {
        console.log(`  - ${voice.name}: ${voice.language} (${voice.voice_id})`);
      });
      
      // Filter voices by language using verified_languages array
      const filteredVoices = allVoices.filter((voice: ElevenLabsVoice) => {
        // Check primary language field
        const primaryLanguageMatch = targetLanguages.some(lang => 
          voice.language?.toLowerCase().includes(lang.toLowerCase())
        );
        
        // Check verified_languages array
        const verifiedLanguageMatch = voice.verified_languages?.some((verified: any) => 
          targetLanguages.some(lang => 
            verified.language?.toLowerCase().includes(lang.toLowerCase()) ||
            verified.locale?.toLowerCase().includes(lang.toLowerCase())
          )
        );
        
        return primaryLanguageMatch || verifiedLanguageMatch;
      });
      
      console.log(`ElevenLabs: Found ${filteredVoices.length} voices for ${language}:`, 
        filteredVoices.map(v => `${v.name} (${v.language})`));
      
      // If no language-specific voices found, return all voices as fallback
      if (filteredVoices.length === 0 && allVoices.length > 0) {
        console.log(`ElevenLabs: No language-specific voices found for ${language}, returning all voices as fallback`);
        return allVoices;
      }
      
      return filteredVoices;
    } catch (error) {
      console.error('Failed to get voices for language:', error);
      return [];
    }
  }

  async getDefaultVoiceForLanguage(language: string): Promise<string> {
    try {
      // First try to get language-specific voices
      const languageVoices = await this.getVoicesForLanguage(language);
      
      if (languageVoices.length > 0) {
        // Use the first available voice for this language
        const selectedVoice = languageVoices[0];
        console.log(`ElevenLabs: Selected language-specific voice for ${language}: ${selectedVoice.name} (${selectedVoice.language})`);
        return selectedVoice.voice_id;
      }
      
      // Fallback to hardcoded default voices
      const defaultVoices: { [key: string]: string } = {
        english: '21m00Tcm4TlvDq8ikWAM', // Rachel - English (US)
        spanish: 'ErXwobaYiN019PkySvjV', // Antoni - Spanish
        french: 'EXAVITQu4vr4xnSDxMaL',  // Bella - French
        german: 'VR6AewLTigWG4xSOukaG',  // Arnold - German
      };

      const fallbackVoiceId = defaultVoices[language] || defaultVoices.english;
      console.log(`ElevenLabs: Using fallback voice for ${language}: ${fallbackVoiceId}`);
      return fallbackVoiceId;
    } catch (error) {
      console.error(`ElevenLabs: Error getting default voice for ${language}:`, error);
      // Ultimate fallback
      return '21m00Tcm4TlvDq8ikWAM'; // Rachel - English
    }
  }

  async getVoiceInfo(voiceId: string): Promise<ElevenLabsVoice | null> {
    try {
      const allVoices = await this.getVoices();
      const voice = allVoices.find(v => v.voice_id === voiceId);
      return voice || null;
    } catch (error) {
      console.error('ElevenLabs: Error getting voice info:', error);
      return null;
    }
  }

  getModelForLanguage(language: string): string {
    // Use appropriate model for each language
    const modelMap: { [key: string]: string } = {
      english: 'eleven_monolingual_v1',
      spanish: 'eleven_multilingual_v2', // Better for Spanish
      french: 'eleven_multilingual_v2',  // Better for French
      german: 'eleven_multilingual_v2',  // Better for German
    };

    return modelMap[language] || 'eleven_monolingual_v1';
  }

  // Enhanced methods for voice selection and caching
  async previewVoice(voiceId: string, sampleText: string, language: string): Promise<void> {
    const previewText = sampleText || this.getDefaultPreviewText(language);
    console.log(`ElevenLabs: Previewing voice ${voiceId} with text: "${previewText}"`);
    
    await this.speakText(
      previewText,
      voiceId,
      language,
      true, // Use speaker for preview
      1.0, // Normal speed
      'neutral', // Neutral emotion for preview
      0.6, // Default stability
      0.5 // Default similarity boost
      // No callbacks needed for preview
    );
  }

  async preloadCommonPhrases(language: string, cefrLevel: string): Promise<void> {
    console.log(`ElevenLabs: Preloading common phrases for ${language} at ${cefrLevel} level`);
    
    const commonPhrases = this.getCommonPhrasesForLevel(language, cefrLevel);
    const defaultVoiceId = await this.getDefaultVoiceForLanguage(language);
    
    // Preload phrases in background without playing them
    for (const phrase of commonPhrases) {
      try {
        const cacheKey = this.createCacheKey(phrase, defaultVoiceId, 1.0, 'neutral', 0.6, 0.5);
        
        if (!this.audioCache.has(cacheKey)) {
          const modelId = this.getModelForLanguage(language);
          
          const response = await fetch(`${this.baseUrl}/text-to-speech/${defaultVoiceId}`, {
            method: 'POST',
            headers: {
              'xi-api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: phrase,
              model_id: modelId,
              voice_settings: {
                stability: 0.6,
                similarity_boost: 0.5,
              },
            }),
          });

          if (response.ok) {
            const tempUri = `${FileSystem.cacheDirectory}elevenlabs_${cacheKey}.mp3`;
            const audioArrayBuffer = await response.arrayBuffer();
            const audioBase64 = this.arrayBufferToBase64(audioArrayBuffer);
            
            await FileSystem.writeAsStringAsync(tempUri, audioBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            this.audioCache.set(cacheKey, tempUri);
            console.log(`ElevenLabs: Preloaded phrase: "${phrase}"`);
          }
        }
      } catch (error) {
        console.warn(`ElevenLabs: Failed to preload phrase "${phrase}":`, error);
      }
    }
    
    console.log(`ElevenLabs: Preloading completed. Cache size: ${this.audioCache.size}`);
  }

  async clearAudioCache(): Promise<void> {
    console.log(`ElevenLabs: Clearing audio cache (${this.audioCache.size} items)`);
    
    // Delete all cached files
    for (const [key, filePath] of this.audioCache.entries()) {
      try {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      } catch (error) {
        console.warn(`ElevenLabs: Failed to delete cached file ${filePath}:`, error);
      }
    }
    
    // Clear the cache map
    this.audioCache.clear();
    
    // Also clear voices cache
    this.voicesCache = null;
    this.voicesCacheExpiry = 0;
    
    console.log('ElevenLabs: Audio cache cleared');
  }

  async getCacheSize(): Promise<number> {
    let totalSize = 0;
    
    for (const [key, filePath] of this.audioCache.entries()) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      } catch (error) {
        console.warn(`ElevenLabs: Failed to get size for cached file ${filePath}:`, error);
      }
    }
    
    return totalSize;
  }

  async getServiceStatus(): Promise<ElevenLabsStatus> {
    try {
      // Try to fetch voices to check if service is available
      await this.getVoices();
      
      return {
        isAvailable: true,
        recommendedUsage: 'normal'
      };
    } catch (error) {
      console.error('ElevenLabs: Service status check failed:', error);
      
      return {
        isAvailable: false,
        recommendedUsage: 'minimal'
      };
    }
  }

  // Helper methods
  private createCacheKey(
    text: string,
    voiceId: string,
    speed: number,
    emotion: string,
    stability: number,
    similarityBoost: number
  ): string {
    const keyData = `${text}_${voiceId}_${speed}_${emotion}_${stability}_${similarityBoost}`;
    return keyData.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  }

  private getDefaultPreviewText(language: string): string {
    const previewTexts: { [key: string]: string } = {
      english: 'Hello! This is a preview of my voice. How do I sound?',
      spanish: '¡Hola! Esta es una vista previa de mi voz. ¿Cómo sueno?',
      french: 'Bonjour! Ceci est un aperçu de ma voix. Comment est-ce que je sonne?',
      german: 'Hallo! Das ist eine Vorschau meiner Stimme. Wie klinge ich?'
    };
    
    return previewTexts[language] || previewTexts.english;
  }

  private getCommonPhrasesForLevel(language: string, cefrLevel: string): string[] {
    const phrases: { [key: string]: { [key: string]: string[] } } = {
      english: {
        A1: ['Hello', 'Thank you', 'Good morning', 'How are you?', 'Nice to meet you'],
        A2: ['Could you help me?', 'I would like to...', 'Excuse me', 'What time is it?', 'Where is the bathroom?'],
        B1: ['I think that...', 'In my opinion...', 'Could you explain that?', 'That sounds interesting', 'I agree with you'],
        B2: ['Furthermore...', 'On the other hand...', 'I would argue that...', 'This raises the question...', 'To summarize...'],
        C1: ['Nevertheless...', 'Consequently...', 'It could be argued that...', 'This phenomenon...', 'In retrospect...'],
        C2: ['Notwithstanding...', 'Albeit...', 'Hitherto...', 'Vis-à-vis...', 'Ipso facto...']
      },
      spanish: {
        A1: ['Hola', 'Gracias', 'Buenos días', '¿Cómo estás?', 'Mucho gusto'],
        A2: ['¿Podrías ayudarme?', 'Me gustaría...', 'Disculpe', '¿Qué hora es?', '¿Dónde está el baño?'],
        B1: ['Creo que...', 'En mi opinión...', '¿Podrías explicar eso?', 'Eso suena interesante', 'Estoy de acuerdo'],
        B2: ['Además...', 'Por otro lado...', 'Yo argumentaría que...', 'Esto plantea la pregunta...', 'Para resumir...'],
        C1: ['Sin embargo...', 'Por consiguiente...', 'Se podría argumentar que...', 'Este fenómeno...', 'En retrospectiva...'],
        C2: ['No obstante...', 'Aunque...', 'Hasta ahora...', 'Con respecto a...', 'Por el hecho mismo...']
      }
    };
    
    return phrases[language]?.[cefrLevel] || phrases.english.A1;
  }

  private mapSpeedToPlaybackRate(speed: number): number {
    if (speed < 1) {
      return Math.max(0.5, speed - 0.2);
    }
    if (speed > 1) {
      return Math.min(1.5, speed + 0.2);
    }
    return 1.0;
  }
}

import { config } from '../config/environment';

// Export singleton instance
console.log(`ElevenLabs: Initializing with API key: ${config.elevenLabsApiKey.substring(0, 10)}...`);
export const elevenLabsService = new ElevenLabsServiceImpl(config.elevenLabsApiKey); 