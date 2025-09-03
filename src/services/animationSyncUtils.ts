import { AnimationType } from '../types/avatar';

export interface SpeechSyncOptions {
  speechDuration: number;
  wordsPerMinute?: number;
  pauseDuration?: number;
  emphasisWords?: string[];
}

export interface AnimationSyncResult {
  animationSpeed: number;
  keyframes: SyncKeyframe[];
  totalDuration: number;
}

export interface SyncKeyframe {
  timestamp: number;
  animation: AnimationType;
  speed: number;
  intensity?: number;
}

export class AnimationSyncUtils {
  private static readonly DEFAULT_WPM = 150;
  private static readonly DEFAULT_PAUSE_DURATION = 300; // ms
  private static readonly BASE_ANIMATION_DURATION = 2000; // ms

  /**
   * Calculate optimal animation speed based on speech duration
   */
  static calculateAnimationSpeed(speechDuration: number, baseAnimationDuration: number = this.BASE_ANIMATION_DURATION): number {
    if (speechDuration <= 0) return 1.0;
    
    const speedMultiplier = baseAnimationDuration / speechDuration;
    // Clamp speed between 0.3 and 2.5 for natural looking animations
    return Math.max(0.3, Math.min(2.5, speedMultiplier));
  }

  /**
   * Generate synchronized keyframes for speech and animation
   */
  static generateSpeechSyncKeyframes(options: SpeechSyncOptions): AnimationSyncResult {
    const { speechDuration, wordsPerMinute = this.DEFAULT_WPM, pauseDuration = this.DEFAULT_PAUSE_DURATION } = options;
    
    const keyframes: SyncKeyframe[] = [];
    const animationSpeed = this.calculateAnimationSpeed(speechDuration);
    
    // Start with thinking animation (processing)
    keyframes.push({
      timestamp: 0,
      animation: 'thinking',
      speed: 1.0,
    });

    // Transition to talking animation
    keyframes.push({
      timestamp: 200, // 200ms thinking time
      animation: 'talking',
      speed: animationSpeed,
    });

    // Add emphasis keyframes if provided
    if (options.emphasisWords && options.emphasisWords.length > 0) {
      const wordInterval = (speechDuration - 200) / options.emphasisWords.length;
      
      options.emphasisWords.forEach((word, index) => {
        const timestamp = 200 + (index * wordInterval);
        keyframes.push({
          timestamp,
          animation: 'talking',
          speed: animationSpeed * 1.3, // Slightly faster for emphasis
          intensity: 1.2,
        });
      });
    }

    // End with idle animation
    keyframes.push({
      timestamp: speechDuration,
      animation: 'idle',
      speed: 1.0,
    });

    return {
      animationSpeed,
      keyframes,
      totalDuration: speechDuration + pauseDuration,
    };
  }

  /**
   * Generate listening animation sync for voice input
   */
  static generateListeningSyncKeyframes(maxDuration: number = 10000): AnimationSyncResult {
    const keyframes: SyncKeyframe[] = [];
    
    // Start listening immediately
    keyframes.push({
      timestamp: 0,
      animation: 'listening',
      speed: 1.0,
    });

    // Add periodic intensity variations to show active listening
    const intensityInterval = 2000; // Every 2 seconds
    const numIntervals = Math.floor(maxDuration / intensityInterval);
    
    for (let i = 1; i <= numIntervals; i++) {
      keyframes.push({
        timestamp: i * intensityInterval,
        animation: 'listening',
        speed: 1.0 + (Math.sin(i) * 0.2), // Subtle speed variation
        intensity: 1.0 + (Math.cos(i) * 0.3), // Intensity variation
      });
    }

    return {
      animationSpeed: 1.0,
      keyframes,
      totalDuration: maxDuration,
    };
  }

  /**
   * Calculate pause duration based on speech content
   */
  static calculatePauseDuration(speechText: string): number {
    const sentences = speechText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = speechText.split(/\s+/).filter(w => w.length > 0);
    
    // Base pause duration
    let pauseDuration = this.DEFAULT_PAUSE_DURATION;
    
    // Longer pause for longer responses
    if (words.length > 20) {
      pauseDuration += 200;
    }
    
    // Longer pause for multiple sentences
    if (sentences.length > 1) {
      pauseDuration += sentences.length * 100;
    }
    
    return Math.min(pauseDuration, 1000); // Cap at 1 second
  }

  /**
   * Extract emphasis words from speech text
   */
  static extractEmphasisWords(speechText: string): string[] {
    // Simple heuristic: words in ALL CAPS or with exclamation marks
    const words = speechText.split(/\s+/);
    const emphasisWords: string[] = [];
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      
      // All caps words (but not single letters or common abbreviations)
      if (cleanWord.length > 2 && cleanWord === cleanWord.toUpperCase()) {
        emphasisWords.push(cleanWord.toLowerCase());
      }
      
      // Words with exclamation marks
      if (word.includes('!')) {
        emphasisWords.push(cleanWord.toLowerCase());
      }
    });
    
    return emphasisWords;
  }

  /**
   * Create a complete sync plan for a conversation turn
   */
  static createConversationSyncPlan(speechText: string, estimatedDuration?: number): AnimationSyncResult {
    const wordsPerMinute = 150;
    const words = speechText.split(/\s+/).filter(w => w.length > 0);
    const calculatedDuration = estimatedDuration || (words.length / wordsPerMinute) * 60 * 1000;
    
    const emphasisWords = this.extractEmphasisWords(speechText);
    const pauseDuration = this.calculatePauseDuration(speechText);
    
    return this.generateSpeechSyncKeyframes({
      speechDuration: calculatedDuration,
      wordsPerMinute,
      pauseDuration,
      emphasisWords,
    });
  }
}