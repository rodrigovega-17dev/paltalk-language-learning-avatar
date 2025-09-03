import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { AudioEmotion, AudioTag } from '../types/conversation';

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
}

export class ElevenLabsServiceImpl implements ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

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
      const transformedVoices = (data.voices || []).map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        language: voice.labels?.language || voice.verified_languages?.[0]?.language || 'en',
        gender: voice.labels?.gender,
        description: voice.description,
        verified_languages: voice.verified_languages,
        labels: voice.labels,
      }));
      
      console.log('ElevenLabs: Transformed voices:', transformedVoices.slice(0, 2));
      
      return transformedVoices;
    } catch (error) {
      console.error('Failed to fetch ElevenLabs voices:', error);
      throw error;
    }
  }

  // Enhanced speakText method with emotion and voice parameters
  async speakText(
    text: string, 
    voiceId: string, 
    language: string, 
    useSpeaker: boolean = true, 
    speed: number = 1.0,
    emotion: AudioEmotion = 'neutral',
    stability: number = 0.6,
    similarityBoost: number = 0.5
  ): Promise<void> {
    // Clamp speed to ElevenLabs supported range (0.7 to 1.2)
    const clampedSpeed = Math.max(0.7, Math.min(1.2, speed));
    if (speed !== clampedSpeed) {
      console.log(`ElevenLabs: Speed ${speed} clamped to supported range: ${clampedSpeed}`);
    }

    // Clamp stability and similarity boost to valid ranges (0.0 to 1.0)
    const clampedStability = Math.max(0.0, Math.min(1.0, stability));
    const clampedSimilarityBoost = Math.max(0.0, Math.min(1.0, similarityBoost));

    try {
      // Configure audio session for speaker output
      await this.initializeAudio(useSpeaker);

      // Validate that the voice is appropriate for the language
      await this.validateVoiceForLanguage(voiceId, language);

      const modelId = this.getModelForLanguage(language);


      // Enhance text with emotional context if needed
      const enhancedText = this.addEmotionalContext(text, emotion);

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: enhancedText,
          model_id: modelId,
          voice_settings: {
            stability: clampedStability,
            similarity_boost: clampedSimilarityBoost,
          },
          // Add speed control - ElevenLabs supports speed parameter (0.7 to 1.2 range)
          ...(clampedSpeed !== 1.0 && { speed: clampedSpeed }),
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS API error: ${response.status}`);
      }

      // Save audio to temporary file
      const tempUri = `${FileSystem.cacheDirectory}elevenlabs_audio_${Date.now()}.mp3`;
      const audioArrayBuffer = await response.arrayBuffer();
      const audioBase64 = this.arrayBufferToBase64(audioArrayBuffer);
      
      await FileSystem.writeAsStringAsync(tempUri, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create audio object and play with enhanced volume for loudspeaker
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempUri },
        { 
          shouldPlay: true, 
          volume: useSpeaker ? 1.0 : 0.8, // Full volume for loudspeaker
          rate: 1.0,
          shouldCorrectPitch: true,
        }
      );

      // Additional loudspeaker forcing for iOS
      if (useSpeaker) {
        try {
          // Force audio to loudspeaker by setting audio mode again right before playing
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false, // Force loudspeaker
            staysActiveInBackground: false,
          });

        } catch (forceError) {
          console.log('ElevenLabs: Could not force loudspeaker mode before playback');
        }
      }

      return new Promise<void>((resolve, reject) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            // Clean up temporary file
            FileSystem.deleteAsync(tempUri, { idempotent: true });

            resolve();
          }
        });

        sound.playAsync().catch((error) => {
          console.error('ElevenLabs: Speech playback error:', error);
          // Clean up temporary file on error
          FileSystem.deleteAsync(tempUri, { idempotent: true });
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
    // Clamp speed to ElevenLabs supported range (0.7 to 1.2)
    const clampedSpeed = Math.max(0.7, Math.min(1.2, speed));
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
      
      console.log(`ElevenLabs: Initializing audio with useSpeaker: ${useSpeaker}`);
      
      if (useSpeaker) {
        // Force loudspeaker mode with multiple attempts
        const loudspeakerMode = {
          allowsRecordingIOS: false, // Disable recording to focus on playback
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false, // Force loudspeaker
          staysActiveInBackground: false,
        };
        
        // First attempt: Set loudspeaker mode
        await Audio.setAudioModeAsync(loudspeakerMode);
        console.log('ElevenLabs: Set loudspeaker mode (attempt 1)');
        
                 // Second attempt: Force it again with different settings
         try {
           await Audio.setAudioModeAsync({
             ...loudspeakerMode,
             allowsRecordingIOS: true, // Re-enable recording
           });
           console.log('ElevenLabs: Set loudspeaker mode (attempt 2)');
         } catch (secondaryError) {
          console.log('ElevenLabs: Secondary loudspeaker attempt failed, continuing');
        }
        
        // Third attempt: Use a different approach
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false, // This is the key setting
            staysActiveInBackground: false,
          });
          console.log('ElevenLabs: Set loudspeaker mode (attempt 3)');
        } catch (tertiaryError) {
          console.log('ElevenLabs: Tertiary loudspeaker attempt failed');
        }
      } else {
        // Phone speaker mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: true, // Use phone speaker
          staysActiveInBackground: false,
        });
        console.log('ElevenLabs: Set phone speaker mode');
      }
      
      console.log(`ElevenLabs: Audio initialization completed for ${useSpeaker ? 'loudspeaker' : 'phone speaker'}`);
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

  // Helper method to add emotional context to text
  private addEmotionalContext(text: string, emotion: AudioEmotion): string {
    // ElevenLabs handles emotion through voice settings, not text markers
    // Return the original text without any emotional markers
    return text;
  }
}

// Export singleton instance
const apiKey = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ELEVENLABS_API_KEY) || 'test-elevenlabs-api-key';
console.log(`ElevenLabs: Initializing with API key: ${apiKey.substring(0, 10)}...`);
export const elevenLabsService = new ElevenLabsServiceImpl(apiKey); 