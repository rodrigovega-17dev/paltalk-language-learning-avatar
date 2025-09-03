import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioEmotion, AudioTag } from '../types/conversation';

// Enhanced interfaces for ElevenLabs-only implementation
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  language: string;
  gender?: string;
  description?: string;
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

export interface ElevenLabsSettings {
  voiceId: string;
  speed: number; // 0.7 - 1.2
  emotion: AudioEmotion;
  stability: number; // 0.0 - 1.0
  similarityBoost: number; // 0.0 - 1.0
  useSpeaker: boolean;
}

export interface ElevenLabsStatus {
  isAvailable: boolean;
  quotaRemaining?: number;
  rateLimitReset?: Date;
  recommendedUsage: 'normal' | 'conservative' | 'minimal';
}

export interface ElevenLabsError {
  type: 'rate_limit' | 'voice_unavailable' | 'api_down' | 'quota_exceeded' | 'network_error';
  message: string;
  retryAfter?: number;
  suggestedActions: string[];
}

export interface AudioCacheEntry {
  text: string;
  settings: ElevenLabsSettings;
  audioUri: string;
  timestamp: number;
  size: number;
}

export interface UsageOptimization {
  totalRequests: number;
  totalCharacters: number;
  cacheHitRate: number;
  lastOptimizationCheck: Date;
}

export interface EnhancedElevenLabsService {
  // Core TTS functionality
  speakText(text: string, settings: ElevenLabsSettings): Promise<void>;
  
  // Voice management
  getAvailableVoices(language: string): Promise<ElevenLabsVoice[]>;
  previewVoice(voiceId: string, sampleText: string, language: string): Promise<void>;
  getDefaultVoiceForLanguage(language: string): Promise<string>;
  getVoiceInfo(voiceId: string): Promise<ElevenLabsVoice | null>;
  
  // Advanced features
  generateSpeechWithEmotion(text: string, emotion: AudioEmotion, settings: ElevenLabsSettings): Promise<void>;
  
  // Caching and optimization
  preloadCommonPhrases(language: string, cefrLevel: string): Promise<void>;
  clearAudioCache(): Promise<void>;
  getCacheStats(): Promise<{ totalSize: number; entryCount: number; hitRate: number }>;
  
  // Error handling (no fallback)
  handleAPIError(error: any): Promise<ElevenLabsError>;
  getServiceStatus(): Promise<ElevenLabsStatus>;
  
  // Audio tags and presets
  getAudioTags(): AudioTag[];
  getAudioTagById(id: string): AudioTag | undefined;
  applyAudioTag(tagId: string, baseSettings: Partial<ElevenLabsSettings>): ElevenLabsSettings;
  
  // Usage optimization
  getUsageStats(): Promise<UsageOptimization>;
  optimizeUsage(): Promise<void>;
}

export class EnhancedElevenLabsServiceImpl implements EnhancedElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private cacheDirectory: string;
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private usageStats: UsageOptimization;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.cacheDirectory = `${FileSystem.cacheDirectory}elevenlabs_cache/`;
    this.usageStats = {
      totalRequests: 0,
      totalCharacters: 0,
      cacheHitRate: 0,
      lastOptimizationCheck: new Date()
    };
    this.initializeCache();
    this.loadUsageStats();
  }

  private async initializeCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
      }
    } catch (error) {
      console.error('ElevenLabs: Failed to initialize cache directory:', error);
    }
  }

  private async loadUsageStats(): Promise<void> {
    try {
      const stats = await AsyncStorage.getItem('elevenlabs_usage_stats');
      if (stats) {
        this.usageStats = { ...this.usageStats, ...JSON.parse(stats) };
      }
    } catch (error) {
      console.error('ElevenLabs: Failed to load usage stats:', error);
    }
  }

  private async saveUsageStats(): Promise<void> {
    try {
      await AsyncStorage.setItem('elevenlabs_usage_stats', JSON.stringify(this.usageStats));
    } catch (error) {
      console.error('ElevenLabs: Failed to save usage stats:', error);
    }
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

  applyAudioTag(tagId: string, baseSettings: Partial<ElevenLabsSettings>): ElevenLabsSettings {
    const tag = this.getAudioTagById(tagId);
    if (!tag) {
      throw new Error(`Audio tag not found: ${tagId}`);
    }

    return {
      voiceId: baseSettings.voiceId || '',
      speed: tag.speed,
      emotion: tag.emotion,
      stability: tag.stability,
      similarityBoost: tag.similarityBoost,
      useSpeaker: baseSettings.useSpeaker ?? true
    };
  }

  private generateCacheKey(text: string, settings: ElevenLabsSettings): string {
    const settingsHash = JSON.stringify({
      voiceId: settings.voiceId,
      speed: settings.speed,
      emotion: settings.emotion,
      stability: settings.stability,
      similarityBoost: settings.similarityBoost
    });
    return `${text}_${settingsHash}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  }

  private async getCachedAudio(cacheKey: string): Promise<string | null> {
    try {
      const cacheFile = `${this.cacheDirectory}${cacheKey}.mp3`;
      const fileInfo = await FileSystem.getInfoAsync(cacheFile);
      
      if (fileInfo.exists) {
        // Check if cache entry is still valid
        const now = Date.now();
        if (now - fileInfo.modificationTime < this.maxCacheAge) {
          return cacheFile;
        } else {
          // Remove expired cache entry
          await FileSystem.deleteAsync(cacheFile, { idempotent: true });
        }
      }
    } catch (error) {
      console.error('ElevenLabs: Error checking cache:', error);
    }
    return null;
  }

  private async cacheAudio(cacheKey: string, audioData: ArrayBuffer): Promise<string> {
    try {
      const cacheFile = `${this.cacheDirectory}${cacheKey}.mp3`;
      const audioBase64 = this.arrayBufferToBase64(audioData);
      
      await FileSystem.writeAsStringAsync(cacheFile, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return cacheFile;
    } catch (error) {
      console.error('ElevenLabs: Error caching audio:', error);
      throw error;
    }
  }

  async speakText(text: string, settings: ElevenLabsSettings): Promise<void> {
    try {
      // Validate settings
      const validatedSettings = this.validateSettings(settings);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(text, validatedSettings);
      const cachedAudio = await this.getCachedAudio(cacheKey);
      
      if (cachedAudio) {
        console.log('ElevenLabs: Using cached audio');
        await this.playAudio(cachedAudio, validatedSettings.useSpeaker);
        this.updateUsageStats(text.length, true);
        return;
      }

      // Configure audio session
      await this.initializeAudio(validatedSettings.useSpeaker);

      // Validate voice for language
      await this.validateVoiceForLanguage(validatedSettings.voiceId);

      const modelId = this.getModelForLanguage(validatedSettings.voiceId);
      const enhancedText = this.addEmotionalContext(text, validatedSettings.emotion);

      const response = await fetch(`${this.baseUrl}/text-to-speech/${validatedSettings.voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: enhancedText,
          model_id: modelId,
          voice_settings: {
            stability: validatedSettings.stability,
            similarity_boost: validatedSettings.similarityBoost,
          },
          ...(validatedSettings.speed !== 1.0 && { speed: validatedSettings.speed }),
        }),
      });

      if (!response.ok) {
        const error = await this.handleAPIError(response);
        throw error;
      }

      const audioArrayBuffer = await response.arrayBuffer();
      
      // Cache the audio
      const audioUri = await this.cacheAudio(cacheKey, audioArrayBuffer);
      
      // Play the audio
      await this.playAudio(audioUri, validatedSettings.useSpeaker);
      
      this.updateUsageStats(text.length, false);
    } catch (error) {
      console.error('ElevenLabs: Speech synthesis failed:', error);
      throw error;
    }
  }

  private validateSettings(settings: ElevenLabsSettings): ElevenLabsSettings {
    return {
      voiceId: settings.voiceId,
      speed: Math.max(0.7, Math.min(1.2, settings.speed)),
      emotion: settings.emotion,
      stability: Math.max(0.0, Math.min(1.0, settings.stability)),
      similarityBoost: Math.max(0.0, Math.min(1.0, settings.similarityBoost)),
      useSpeaker: settings.useSpeaker
    };
  }

  private async playAudio(audioUri: string, useSpeaker: boolean): Promise<void> {
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { 
        shouldPlay: true, 
        volume: useSpeaker ? 1.0 : 0.8,
        rate: 1.0,
        shouldCorrectPitch: true,
      }
    );

    if (useSpeaker) {
      await this.forceLoudspeaker();
    }

    return new Promise<void>((resolve, reject) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          resolve();
        }
      });

      sound.playAsync().catch((error) => {
        console.error('ElevenLabs: Audio playback error:', error);
        reject(error);
      });
    });
  }

  private async forceLoudspeaker(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.log('ElevenLabs: Could not force loudspeaker mode');
    }
  }

  private updateUsageStats(characters: number, cacheHit: boolean): void {
    this.usageStats.totalRequests++;
    this.usageStats.totalCharacters += characters;
    
    if (cacheHit) {
      this.usageStats.cacheHitRate = 
        (this.usageStats.cacheHitRate * (this.usageStats.totalRequests - 1) + 1) / this.usageStats.totalRequests;
    } else {
      this.usageStats.cacheHitRate = 
        (this.usageStats.cacheHitRate * (this.usageStats.totalRequests - 1)) / this.usageStats.totalRequests;
    }
    
    this.saveUsageStats();
  }

  async getAvailableVoices(language: string): Promise<ElevenLabsVoice[]> {
    try {
      console.log(`ElevenLabs: Fetching voices for language: ${language}`);
      
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await this.handleAPIError(response);
        throw error;
      }

      const data = await response.json();
      const allVoices = (data.voices || []).map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        language: voice.labels?.language || voice.verified_languages?.[0]?.language || 'en',
        gender: voice.labels?.gender,
        description: voice.description,
        verified_languages: voice.verified_languages,
        labels: voice.labels,
      }));

      // Filter voices by language
      const languageMap: { [key: string]: string[] } = {
        english: ['en', 'en-US', 'en-GB'],
        spanish: ['es', 'es-ES', 'es-MX'],
        french: ['fr', 'fr-FR'],
        german: ['de', 'de-DE']
      };
      
      const targetLanguages = languageMap[language] || ['en'];
      
      const filteredVoices = allVoices.filter((voice: ElevenLabsVoice) => {
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
      
      return filteredVoices.length > 0 ? filteredVoices : allVoices;
    } catch (error) {
      console.error('ElevenLabs: Failed to fetch voices:', error);
      throw error;
    }
  }

  async previewVoice(voiceId: string, sampleText: string, language: string): Promise<void> {
    const previewSettings: ElevenLabsSettings = {
      voiceId,
      speed: 1.0,
      emotion: 'neutral',
      stability: 0.6,
      similarityBoost: 0.5,
      useSpeaker: true
    };

    const previewText = sampleText || this.getDefaultPreviewText(language);
    await this.speakText(previewText, previewSettings);
  }

  private getDefaultPreviewText(language: string): string {
    const previewTexts: { [key: string]: string } = {
      english: 'Hello! This is a voice preview for language learning.',
      spanish: 'Hola! Esta es una vista previa de voz para aprender idiomas.',
      french: 'Bonjour! Ceci est un aperçu vocal pour l\'apprentissage des langues.',
      german: 'Hallo! Dies ist eine Sprachvorschau zum Sprachenlernen.'
    };
    return previewTexts[language] || previewTexts.english;
  }

  async getDefaultVoiceForLanguage(language: string): Promise<string> {
    try {
      const languageVoices = await this.getAvailableVoices(language);
      
      if (languageVoices.length > 0) {
        return languageVoices[0].voice_id;
      }
      
      // Fallback to hardcoded defaults
      const defaultVoices: { [key: string]: string } = {
        english: '21m00Tcm4TlvDq8ikWAM', // Rachel
        spanish: 'ErXwobaYiN019PkySvjV', // Antoni
        french: 'EXAVITQu4vr4xnSDxMaL',  // Bella
        german: 'VR6AewLTigWG4xSOukaG',  // Arnold
      };

      return defaultVoices[language] || defaultVoices.english;
    } catch (error) {
      console.error(`ElevenLabs: Error getting default voice for ${language}:`, error);
      return '21m00Tcm4TlvDq8ikWAM'; // Ultimate fallback
    }
  }

  async getVoiceInfo(voiceId: string): Promise<ElevenLabsVoice | null> {
    try {
      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const voice = await response.json();
      return {
        voice_id: voice.voice_id,
        name: voice.name,
        language: voice.labels?.language || 'en',
        gender: voice.labels?.gender,
        description: voice.description,
        verified_languages: voice.verified_languages,
        labels: voice.labels,
      };
    } catch (error) {
      console.error('ElevenLabs: Error getting voice info:', error);
      return null;
    }
  }

  async generateSpeechWithEmotion(text: string, emotion: AudioEmotion, settings: ElevenLabsSettings): Promise<void> {
    const emotionalSettings = { ...settings, emotion };
    await this.speakText(text, emotionalSettings);
  }

  async preloadCommonPhrases(language: string, cefrLevel: string): Promise<void> {
    const commonPhrases = this.getCommonPhrases(language, cefrLevel);
    const defaultVoiceId = await this.getDefaultVoiceForLanguage(language);
    
    const settings: ElevenLabsSettings = {
      voiceId: defaultVoiceId,
      speed: 1.0,
      emotion: 'neutral',
      stability: 0.6,
      similarityBoost: 0.5,
      useSpeaker: true
    };

    for (const phrase of commonPhrases) {
      try {
        const cacheKey = this.generateCacheKey(phrase, settings);
        const cached = await this.getCachedAudio(cacheKey);
        
        if (!cached) {
          // Generate and cache without playing
          await this.generateAndCacheAudio(phrase, settings);
        }
      } catch (error) {
        console.error(`ElevenLabs: Failed to preload phrase: ${phrase}`, error);
      }
    }
  }

  private getCommonPhrases(language: string, cefrLevel: string): string[] {
    const phrases: { [key: string]: { [key: string]: string[] } } = {
      english: {
        A1: ['Hello', 'Thank you', 'Please', 'Excuse me', 'I don\'t understand'],
        A2: ['How are you?', 'What time is it?', 'Where is the bathroom?', 'I would like...'],
        B1: ['Could you help me?', 'I\'m looking for...', 'What do you recommend?'],
        B2: ['I\'d like to make a reservation', 'Could you explain that again?'],
        C1: ['I\'m afraid I have to disagree', 'Let me think about that'],
        C2: ['That\'s an interesting perspective', 'I couldn\'t agree more']
      },
      spanish: {
        A1: ['Hola', 'Gracias', 'Por favor', 'Disculpe', 'No entiendo'],
        A2: ['¿Cómo estás?', '¿Qué hora es?', '¿Dónde está el baño?', 'Me gustaría...'],
        B1: ['¿Podrías ayudarme?', 'Estoy buscando...', '¿Qué recomiendas?'],
        B2: ['Me gustaría hacer una reserva', '¿Podrías explicar eso otra vez?'],
        C1: ['Me temo que tengo que estar en desacuerdo', 'Déjame pensar en eso'],
        C2: ['Esa es una perspectiva interesante', 'No podría estar más de acuerdo']
      }
    };

    return phrases[language]?.[cefrLevel] || phrases.english.A1;
  }

  private async generateAndCacheAudio(text: string, settings: ElevenLabsSettings): Promise<void> {
    try {
      const modelId = this.getModelForLanguage(settings.voiceId);
      const enhancedText = this.addEmotionalContext(text, settings.emotion);

      const response = await fetch(`${this.baseUrl}/text-to-speech/${settings.voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: enhancedText,
          model_id: modelId,
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
          },
          ...(settings.speed !== 1.0 && { speed: settings.speed }),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const audioArrayBuffer = await response.arrayBuffer();
      const cacheKey = this.generateCacheKey(text, settings);
      await this.cacheAudio(cacheKey, audioArrayBuffer);
    } catch (error) {
      console.error('ElevenLabs: Failed to generate and cache audio:', error);
      throw error;
    }
  }

  async clearAudioCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDirectory, { idempotent: true });
        await this.initializeCache();
      }
    } catch (error) {
      console.error('ElevenLabs: Failed to clear cache:', error);
    }
  }

  async getCacheStats(): Promise<{ totalSize: number; entryCount: number; hitRate: number }> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.cacheDirectory);
      let totalSize = 0;
      
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${this.cacheDirectory}${file}`);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      }

      return {
        totalSize,
        entryCount: files.length,
        hitRate: this.usageStats.cacheHitRate
      };
    } catch (error) {
      console.error('ElevenLabs: Failed to get cache stats:', error);
      return { totalSize: 0, entryCount: 0, hitRate: 0 };
    }
  }

  async handleAPIError(response: Response): Promise<ElevenLabsError> {
    let errorType: ElevenLabsError['type'] = 'api_down';
    let message = 'Unknown API error';
    let retryAfter: number | undefined;
    let suggestedActions: string[] = [];

    try {
      const errorData = await response.json();
      message = errorData.detail || errorData.message || `HTTP ${response.status}`;
    } catch {
      message = `HTTP ${response.status}`;
    }

    switch (response.status) {
      case 429:
        errorType = 'rate_limit';
        retryAfter = parseInt(response.headers.get('retry-after') || '60');
        suggestedActions = [
          'Wait before making another request',
          'Consider using cached audio',
          'Reduce request frequency'
        ];
        break;
      case 402:
        errorType = 'quota_exceeded';
        suggestedActions = [
          'Check your ElevenLabs subscription',
          'Upgrade your plan',
          'Use cached audio when possible'
        ];
        break;
      case 404:
        errorType = 'voice_unavailable';
        suggestedActions = [
          'Select a different voice',
          'Check voice availability',
          'Use default voice for language'
        ];
        break;
      default:
        errorType = 'api_down';
        suggestedActions = [
          'Check internet connection',
          'Try again later',
          'Verify API key'
        ];
    }

    return {
      type: errorType,
      message,
      retryAfter,
      suggestedActions
    };
  }

  async getServiceStatus(): Promise<ElevenLabsStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          isAvailable: false,
          recommendedUsage: 'minimal'
        };
      }

      const userData = await response.json();
      const quotaRemaining = userData.subscription?.character_limit - userData.subscription?.character_count;
      
      let recommendedUsage: ElevenLabsStatus['recommendedUsage'] = 'normal';
      if (quotaRemaining < 1000) {
        recommendedUsage = 'minimal';
      } else if (quotaRemaining < 5000) {
        recommendedUsage = 'conservative';
      }

      return {
        isAvailable: true,
        quotaRemaining,
        recommendedUsage
      };
    } catch (error) {
      return {
        isAvailable: false,
        recommendedUsage: 'minimal'
      };
    }
  }

  async getUsageStats(): Promise<UsageOptimization> {
    return { ...this.usageStats };
  }

  async optimizeUsage(): Promise<void> {
    const now = new Date();
    const timeSinceLastCheck = now.getTime() - this.usageStats.lastOptimizationCheck.getTime();
    
    // Only optimize once per hour
    if (timeSinceLastCheck < 60 * 60 * 1000) {
      return;
    }

    try {
      // Clean up old cache entries
      const files = await FileSystem.readDirectoryAsync(this.cacheDirectory);
      const cutoffTime = now.getTime() - this.maxCacheAge;
      
      for (const file of files) {
        const filePath = `${this.cacheDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.modificationTime < cutoffTime) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      }

      // Check cache size and clean if necessary
      const cacheStats = await this.getCacheStats();
      if (cacheStats.totalSize > this.maxCacheSize) {
        await this.clearAudioCache();
      }

      this.usageStats.lastOptimizationCheck = now;
      await this.saveUsageStats();
    } catch (error) {
      console.error('ElevenLabs: Failed to optimize usage:', error);
    }
  }

  private async validateVoiceForLanguage(voiceId: string): Promise<void> {
    // Implementation similar to original but simplified for enhanced version
    try {
      const voiceInfo = await this.getVoiceInfo(voiceId);
      if (!voiceInfo) {
        console.warn(`ElevenLabs: Voice ${voiceId} not found`);
      }
    } catch (error) {
      console.error('ElevenLabs: Error validating voice:', error);
    }
  }

  private getModelForLanguage(voiceId: string): string {
    // Use multilingual model for better quality
    return 'eleven_multilingual_v2';
  }

  private addEmotionalContext(text: string, emotion: AudioEmotion): string {
    // ElevenLabs handles emotion through voice settings
    return text;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async initializeAudio(useSpeaker: boolean): Promise<void> {
    try {
      await Audio.requestPermissionsAsync();
      
      if (useSpeaker) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: true,
          staysActiveInBackground: false,
        });
      }
    } catch (error) {
      console.error('ElevenLabs: Audio initialization failed:', error);
      throw new Error('Failed to initialize audio permissions');
    }
  }
}

import { config } from '../config/environment';

// Export singleton instance
export const enhancedElevenLabsService = new EnhancedElevenLabsServiceImpl(config.elevenLabsApiKey);