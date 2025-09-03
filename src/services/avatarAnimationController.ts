import { AnimationType } from '../types/avatar';
import { AnimationSyncUtils, AnimationSyncResult, SyncKeyframe } from './animationSyncUtils';

export interface AvatarAnimationController {
  playIdleAnimation(): void;
  playListeningAnimation(): void;
  playTalkingAnimation(): void;
  playThinkingAnimation(): void;
  stopAllAnimations(): void;
  setAnimationSpeed(speed: number): void;
  getCurrentAnimation(): AnimationType;
  isAnimating(): boolean;
  setOnAnimationChange(callback: (animation: AnimationType, isAnimating: boolean) => void): void;
}

export class AvatarAnimationControllerImpl implements AvatarAnimationController {
  private currentAnimation: AnimationType = 'idle';
  private animating: boolean = false;
  private animationSpeed: number = 1.0;
  private animationRef: any = null;
  private onAnimationChange?: (animation: AnimationType, isAnimating: boolean) => void;

  setOnAnimationChange(callback: (animation: AnimationType, isAnimating: boolean) => void): void {
    this.onAnimationChange = callback;
  }
  private transitionTimeout: NodeJS.Timeout | null = null;
  private isTransitioning: boolean = false;

  constructor(onAnimationChange?: (animation: AnimationType, isAnimating: boolean) => void) {
    this.onAnimationChange = onAnimationChange;
  }

  setAnimationRef(ref: any): void {
    this.animationRef = ref;
  }

  playIdleAnimation(): void {
    console.log('AvatarController: playIdleAnimation called');
    this.setAnimation('idle');
  }

  playListeningAnimation(): void {
    console.log('AvatarController: playListeningAnimation called');
    this.setAnimation('listening');
  }

  playTalkingAnimation(): void {
    console.log('AvatarController: playTalkingAnimation called');
    this.setAnimation('talking');
  }

  playThinkingAnimation(): void {
    console.log('AvatarController: playThinkingAnimation called');
    this.setAnimation('thinking');
  }

  stopAllAnimations(): void {
    // Clear any pending transitions
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
    
    this.isTransitioning = false;
    
    if (this.animationRef) {
      this.animationRef.pause();
    }
    this.animating = false;
    this.notifyChange();
  }

  setAnimationSpeed(speed: number): void {
    this.animationSpeed = Math.max(0.1, Math.min(3.0, speed)); // Clamp between 0.1 and 3.0
    if (this.animationRef && this.animationRef.setSpeed && typeof this.animationRef.setSpeed === 'function') {
      this.animationRef.setSpeed(this.animationSpeed);
    }
  }

  getCurrentAnimation(): AnimationType {
    return this.currentAnimation;
  }

  isAnimating(): boolean {
    return this.animating;
  }

  private setAnimation(animation: AnimationType): void {
    console.log(`AvatarController: setAnimation called - target: ${animation}, current: ${this.currentAnimation}, animating: ${this.animating}, transitioning: ${this.isTransitioning}, animationRef exists: ${!!this.animationRef}`);
    
    if (this.currentAnimation === animation && this.animating && !this.isTransitioning) {
      console.log(`AvatarController: Skipping animation - already playing ${animation}`);
      return; // Already playing this animation
    }

    // Clear any existing transition timeout
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }

    // Implement smooth transition
    this.smoothTransitionTo(animation);
  }

  private smoothTransitionTo(targetAnimation: AnimationType): void {
    if (this.isTransitioning) {
      return; // Already transitioning
    }

    this.isTransitioning = true;

    // If we're not currently on idle and target isn't idle, transition through idle first
    if (this.currentAnimation !== 'idle' && targetAnimation !== 'idle' && this.currentAnimation !== targetAnimation) {
      this.transitionThroughIdle(targetAnimation);
    } else {
      this.executeTransition(targetAnimation);
    }
  }

  private transitionThroughIdle(finalTarget: AnimationType): void {
    // First transition to idle
    this.executeTransition('idle');
    
    // Then transition to target after a brief pause
    this.transitionTimeout = setTimeout(() => {
      this.executeTransition(finalTarget);
    }, 200); // 200ms pause at idle
  }

  private executeTransition(animation: AnimationType): void {
    const previousAnimation = this.currentAnimation;
    this.currentAnimation = animation;
    this.animating = true;

    console.log(`AvatarController: executeTransition - ${previousAnimation} -> ${animation}, animationRef exists: ${!!this.animationRef}`);

    if (this.animationRef) {
      console.log(`AvatarController: Playing animation ${animation} on LottieView`);
      // Smooth transition with fade effect (if supported by the animation library)
      this.animationRef.play();
      
      // Set appropriate speed for the new animation (if supported)
      if (this.animationRef.setSpeed && typeof this.animationRef.setSpeed === 'function') {
        this.animationRef.setSpeed(this.animationSpeed);
      }
    } else {
      console.log(`AvatarController: WARNING - No animationRef available for animation ${animation}`);
    }

    this.isTransitioning = false;
    this.notifyChange();

    // Log transition for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Avatar animation transition: ${previousAnimation} -> ${animation}`);
    }
  }

  private notifyChange(): void {
    if (this.onAnimationChange) {
      this.onAnimationChange(this.currentAnimation, this.animating);
    }
  }

  // Animation synchronization utilities for speech timing
  syncWithSpeech(speechDuration: number): void {
    if (this.currentAnimation === 'talking') {
      const speed = AnimationSyncUtils.calculateAnimationSpeed(speechDuration);
      this.setAnimationSpeed(speed);
    }
  }

  // Advanced speech synchronization with keyframes
  syncWithSpeechText(speechText: string, estimatedDuration?: number): AnimationSyncResult {
    const syncPlan = AnimationSyncUtils.createConversationSyncPlan(speechText, estimatedDuration);
    this.executeSyncPlan(syncPlan);
    return syncPlan;
  }

  // Execute a complete synchronization plan
  private executeSyncPlan(syncPlan: AnimationSyncResult): void {
    syncPlan.keyframes.forEach((keyframe, index) => {
      setTimeout(() => {
        this.setAnimation(keyframe.animation);
        this.setAnimationSpeed(keyframe.speed);
      }, keyframe.timestamp);
    });
  }

  // Start listening mode with appropriate animation
  startListeningMode(maxDuration: number = 10000): AnimationSyncResult {
    const syncPlan = AnimationSyncUtils.generateListeningSyncKeyframes(maxDuration);
    this.executeSyncPlan(syncPlan);
    return syncPlan;
  }

  onAnimationFinish(): void {
    // Return to idle state when animation completes (except for looping animations)
    if (this.currentAnimation === 'thinking') {
      this.playIdleAnimation();
    }
  }
}