import { AnimationSyncUtils } from '../services/animationSyncUtils';

describe('AnimationSyncUtils', () => {
  describe('calculateAnimationSpeed', () => {
    test('should return 1.0 for speech duration equal to base duration', () => {
      const speed = AnimationSyncUtils.calculateAnimationSpeed(2000, 2000);
      expect(speed).toBe(1.0);
    });

    test('should return higher speed for shorter speech', () => {
      const speed = AnimationSyncUtils.calculateAnimationSpeed(1000, 2000);
      expect(speed).toBe(2.0);
    });

    test('should return lower speed for longer speech', () => {
      const speed = AnimationSyncUtils.calculateAnimationSpeed(4000, 2000);
      expect(speed).toBe(0.5);
    });

    test('should clamp speed to minimum value', () => {
      const speed = AnimationSyncUtils.calculateAnimationSpeed(10000, 2000);
      expect(speed).toBe(0.3); // Minimum clamped value
    });

    test('should clamp speed to maximum value', () => {
      const speed = AnimationSyncUtils.calculateAnimationSpeed(500, 2000);
      expect(speed).toBe(2.5); // Maximum clamped value
    });

    test('should handle zero or negative duration', () => {
      expect(AnimationSyncUtils.calculateAnimationSpeed(0)).toBe(1.0);
      expect(AnimationSyncUtils.calculateAnimationSpeed(-100)).toBe(1.0);
    });
  });

  describe('generateSpeechSyncKeyframes', () => {
    test('should generate basic keyframes for speech', () => {
      const result = AnimationSyncUtils.generateSpeechSyncKeyframes({
        speechDuration: 3000,
      });

      expect(result.keyframes).toHaveLength(3);
      expect(result.keyframes[0].animation).toBe('thinking');
      expect(result.keyframes[1].animation).toBe('talking');
      expect(result.keyframes[2].animation).toBe('idle');
      expect(result.totalDuration).toBe(3300); // 3000 + 300 default pause
    });

    test('should include emphasis keyframes when provided', () => {
      const result = AnimationSyncUtils.generateSpeechSyncKeyframes({
        speechDuration: 4000,
        emphasisWords: ['important', 'crucial'],
      });

      expect(result.keyframes.length).toBeGreaterThan(3);
      
      // Should have emphasis keyframes with higher speed
      const emphasisKeyframes = result.keyframes.filter(kf => kf.intensity && kf.intensity > 1);
      expect(emphasisKeyframes).toHaveLength(2);
    });

    test('should respect custom pause duration', () => {
      const customPause = 500;
      const result = AnimationSyncUtils.generateSpeechSyncKeyframes({
        speechDuration: 2000,
        pauseDuration: customPause,
      });

      expect(result.totalDuration).toBe(2500); // 2000 + 500
    });
  });

  describe('generateListeningSyncKeyframes', () => {
    test('should generate listening keyframes with default duration', () => {
      const result = AnimationSyncUtils.generateListeningSyncKeyframes();

      expect(result.keyframes[0].animation).toBe('listening');
      expect(result.totalDuration).toBe(10000); // Default 10 seconds
      expect(result.animationSpeed).toBe(1.0);
    });

    test('should generate keyframes with custom duration', () => {
      const result = AnimationSyncUtils.generateListeningSyncKeyframes(5000);

      expect(result.totalDuration).toBe(5000);
      expect(result.keyframes.length).toBeGreaterThan(1); // Should have intensity variations
    });

    test('should include intensity variations for active listening', () => {
      const result = AnimationSyncUtils.generateListeningSyncKeyframes(6000);

      const intensityKeyframes = result.keyframes.filter(kf => kf.intensity !== undefined);
      expect(intensityKeyframes.length).toBeGreaterThan(0);
    });
  });

  describe('calculatePauseDuration', () => {
    test('should return default pause for simple text', () => {
      const duration = AnimationSyncUtils.calculatePauseDuration('Hello world');
      expect(duration).toBe(300); // Default pause duration
    });

    test('should increase pause for longer text', () => {
      const longText = 'This is a much longer sentence with many words that should result in a longer pause duration for the avatar. This sentence has more than twenty words which should trigger the longer pause logic.';
      const duration = AnimationSyncUtils.calculatePauseDuration(longText);
      expect(duration).toBeGreaterThan(300);
    });

    test('should increase pause for multiple sentences', () => {
      const multiSentence = 'First sentence. Second sentence! Third sentence?';
      const duration = AnimationSyncUtils.calculatePauseDuration(multiSentence);
      expect(duration).toBeGreaterThan(300);
    });

    test('should cap pause duration at maximum', () => {
      const veryLongText = 'This is an extremely long text with many sentences. '.repeat(20);
      const duration = AnimationSyncUtils.calculatePauseDuration(veryLongText);
      expect(duration).toBeLessThanOrEqual(1000); // Capped at 1 second
    });
  });

  describe('extractEmphasisWords', () => {
    test('should extract words in ALL CAPS', () => {
      const text = 'This is IMPORTANT and CRUCIAL information';
      const emphasisWords = AnimationSyncUtils.extractEmphasisWords(text);
      expect(emphasisWords).toContain('important');
      expect(emphasisWords).toContain('crucial');
    });

    test('should extract words with exclamation marks', () => {
      const text = 'Hello! This is exciting! Great job!';
      const emphasisWords = AnimationSyncUtils.extractEmphasisWords(text);
      expect(emphasisWords).toContain('hello');
      expect(emphasisWords).toContain('exciting');
      expect(emphasisWords).toContain('job'); // "Great job!" -> "job" is extracted
    });

    test('should ignore single letters and common abbreviations', () => {
      const text = 'I AM going to the USA today';
      const emphasisWords = AnimationSyncUtils.extractEmphasisWords(text);
      expect(emphasisWords).not.toContain('i');
      expect(emphasisWords).toContain('usa'); // 3+ letters
    });

    test('should return empty array for text without emphasis', () => {
      const text = 'This is normal text without any emphasis';
      const emphasisWords = AnimationSyncUtils.extractEmphasisWords(text);
      expect(emphasisWords).toHaveLength(0);
    });
  });

  describe('createConversationSyncPlan', () => {
    test('should create complete sync plan for conversation', () => {
      const speechText = 'Hello! How are you doing TODAY?';
      const result = AnimationSyncUtils.createConversationSyncPlan(speechText);

      expect(result.keyframes.length).toBeGreaterThanOrEqual(3); // At least thinking -> talking -> idle
      expect(result.animationSpeed).toBeGreaterThan(0);
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    test('should use provided duration when given', () => {
      const speechText = 'Short text';
      const customDuration = 5000;
      const result = AnimationSyncUtils.createConversationSyncPlan(speechText, customDuration);

      // Should use custom duration for calculations
      const talkingKeyframe = result.keyframes.find(kf => kf.animation === 'talking');
      expect(talkingKeyframe).toBeDefined();
    });

    test('should calculate duration based on word count when not provided', () => {
      const shortText = 'Hi';
      const longText = 'This is a much longer sentence with many more words than the short one';
      
      const shortResult = AnimationSyncUtils.createConversationSyncPlan(shortText);
      const longResult = AnimationSyncUtils.createConversationSyncPlan(longText);

      expect(longResult.totalDuration).toBeGreaterThan(shortResult.totalDuration);
    });

    test('should handle empty text gracefully', () => {
      const result = AnimationSyncUtils.createConversationSyncPlan('');
      
      expect(result.keyframes).toHaveLength(3); // Basic thinking -> talking -> idle
      expect(result.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large text efficiently', () => {
      const largeText = 'This is a test sentence. '.repeat(1000);
      const startTime = performance.now();
      
      AnimationSyncUtils.createConversationSyncPlan(largeText);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    test('should handle many emphasis words efficiently', () => {
      const textWithManyEmphasis = 'WORD1 WORD2 WORD3 WORD4 WORD5 '.repeat(100);
      const startTime = performance.now();
      
      AnimationSyncUtils.extractEmphasisWords(textWithManyEmphasis);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(50);
    });
  });
});