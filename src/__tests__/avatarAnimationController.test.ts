import { AvatarAnimationControllerImpl } from '../services/avatarAnimationController';
import { AnimationType } from '../types/avatar';

// Mock the animation ref
const mockAnimationRef = {
  play: jest.fn(),
  pause: jest.fn(),
  setSpeed: jest.fn(),
};

describe('AvatarAnimationController', () => {
  let controller: AvatarAnimationControllerImpl;
  let onAnimationChangeMock: jest.Mock;

  beforeEach(() => {
    onAnimationChangeMock = jest.fn();
    controller = new AvatarAnimationControllerImpl(onAnimationChangeMock);
    controller.setAnimationRef(mockAnimationRef);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Basic Animation Control', () => {
    test('should initialize with idle animation', () => {
      expect(controller.getCurrentAnimation()).toBe('idle');
      expect(controller.isAnimating()).toBe(false);
    });

    test('should play idle animation', () => {
      controller.playIdleAnimation();
      
      expect(controller.getCurrentAnimation()).toBe('idle');
      expect(controller.isAnimating()).toBe(true);
      expect(mockAnimationRef.play).toHaveBeenCalled();
      expect(onAnimationChangeMock).toHaveBeenCalledWith('idle', true);
    });

    test('should play listening animation', () => {
      controller.playListeningAnimation();
      
      expect(controller.getCurrentAnimation()).toBe('listening');
      expect(controller.isAnimating()).toBe(true);
      expect(mockAnimationRef.play).toHaveBeenCalled();
      expect(onAnimationChangeMock).toHaveBeenCalledWith('listening', true);
    });

    test('should play talking animation', () => {
      controller.playTalkingAnimation();
      
      expect(controller.getCurrentAnimation()).toBe('talking');
      expect(controller.isAnimating()).toBe(true);
      expect(mockAnimationRef.play).toHaveBeenCalled();
      expect(onAnimationChangeMock).toHaveBeenCalledWith('talking', true);
    });

    test('should play thinking animation', () => {
      controller.playThinkingAnimation();
      
      expect(controller.getCurrentAnimation()).toBe('thinking');
      expect(controller.isAnimating()).toBe(true);
      expect(mockAnimationRef.play).toHaveBeenCalled();
      expect(onAnimationChangeMock).toHaveBeenCalledWith('thinking', true);
    });

    test('should stop all animations', () => {
      controller.playTalkingAnimation();
      controller.stopAllAnimations();
      
      expect(controller.isAnimating()).toBe(false);
      expect(mockAnimationRef.pause).toHaveBeenCalled();
      expect(onAnimationChangeMock).toHaveBeenLastCalledWith('talking', false);
    });
  });

  describe('Animation Speed Control', () => {
    test('should set animation speed within valid range', () => {
      controller.setAnimationSpeed(1.5);
      expect(mockAnimationRef.setSpeed).toHaveBeenCalledWith(1.5);
    });

    test('should clamp animation speed to minimum', () => {
      controller.setAnimationSpeed(0.05);
      expect(mockAnimationRef.setSpeed).toHaveBeenCalledWith(0.1);
    });

    test('should clamp animation speed to maximum', () => {
      controller.setAnimationSpeed(5.0);
      expect(mockAnimationRef.setSpeed).toHaveBeenCalledWith(3.0);
    });
  });

  describe('Speech Synchronization', () => {
    test('should sync with speech duration', () => {
      controller.playTalkingAnimation();
      controller.syncWithSpeech(4000); // 4 second speech
      
      // Should calculate appropriate speed (2000ms base / 4000ms speech = 0.5x speed)
      expect(mockAnimationRef.setSpeed).toHaveBeenCalledWith(0.5);
    });

    test('should not sync if not in talking mode', () => {
      controller.playIdleAnimation();
      jest.clearAllMocks(); // Clear the setSpeed call from playIdleAnimation
      controller.syncWithSpeech(4000);
      
      // Should not change speed when not talking
      expect(mockAnimationRef.setSpeed).not.toHaveBeenCalled();
    });

    test('should handle speech text synchronization', () => {
      const speechText = "Hello, how are you today?";
      const syncPlan = controller.syncWithSpeechText(speechText);
      
      expect(syncPlan).toBeDefined();
      expect(syncPlan.keyframes).toHaveLength(3); // thinking -> talking -> idle
      expect(syncPlan.animationSpeed).toBeGreaterThan(0);
    });
  });

  describe('Animation State Transitions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should not transition if already playing same animation', () => {
      controller.playIdleAnimation();
      jest.clearAllMocks();
      
      controller.playIdleAnimation();
      
      expect(mockAnimationRef.play).not.toHaveBeenCalled();
      expect(onAnimationChangeMock).not.toHaveBeenCalled();
    });

    test('should transition through idle for non-idle to non-idle transitions', () => {
      controller.playTalkingAnimation();
      jest.clearAllMocks();
      
      controller.playListeningAnimation();
      
      // Should first transition to idle
      expect(controller.getCurrentAnimation()).toBe('idle');
      
      // Then after timeout, transition to listening
      jest.advanceTimersByTime(200);
      expect(controller.getCurrentAnimation()).toBe('listening');
    });

    test('should handle thinking animation finish by returning to idle', () => {
      controller.playThinkingAnimation();
      controller.onAnimationFinish();
      
      expect(controller.getCurrentAnimation()).toBe('idle');
    });
  });

  describe('Listening Mode', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should start listening mode with appropriate keyframes', () => {
      const syncPlan = controller.startListeningMode(5000);
      
      expect(syncPlan).toBeDefined();
      expect(syncPlan.keyframes[0].animation).toBe('listening');
      expect(syncPlan.totalDuration).toBe(5000);
    });

    test('should use default duration for listening mode', () => {
      const syncPlan = controller.startListeningMode();
      
      expect(syncPlan.totalDuration).toBe(10000); // Default 10 seconds
    });
  });

  describe('Error Handling', () => {
    test('should handle missing animation ref gracefully', () => {
      const controllerWithoutRef = new AvatarAnimationControllerImpl();
      
      expect(() => {
        controllerWithoutRef.playTalkingAnimation();
        controllerWithoutRef.setAnimationSpeed(1.5);
        controllerWithoutRef.stopAllAnimations();
      }).not.toThrow();
    });

    test('should clear timeouts when stopping animations', () => {
      jest.useFakeTimers();
      
      controller.playTalkingAnimation();
      controller.playListeningAnimation(); // This creates a timeout
      const currentAnimation = controller.getCurrentAnimation();
      controller.stopAllAnimations();
      
      // Advance timers to ensure no delayed transitions occur
      jest.advanceTimersByTime(1000);
      
      expect(controller.getCurrentAnimation()).toBe(currentAnimation); // Should stay at animation when stopped
      expect(controller.isAnimating()).toBe(false);
      
      jest.useRealTimers();
    });
  });

  describe('Performance', () => {
    test('should handle rapid animation changes efficiently', () => {
      const startTime = performance.now();
      
      // Rapidly change animations
      for (let i = 0; i < 100; i++) {
        const animations: AnimationType[] = ['idle', 'listening', 'talking', 'thinking'];
        controller.setAnimation(animations[i % 4] as any);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    test('should not create memory leaks with multiple transitions', () => {
      jest.useFakeTimers();
      
      // Create multiple overlapping transitions
      for (let i = 0; i < 10; i++) {
        controller.playTalkingAnimation();
        controller.playListeningAnimation();
      }
      
      // Clean up
      controller.stopAllAnimations();
      jest.advanceTimersByTime(5000);
      
      // Should not have any pending timeouts
      expect(jest.getTimerCount()).toBe(0);
      
      jest.useRealTimers();
    });
  });
});