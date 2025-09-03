import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { AvatarAnimationControllerImpl } from '../services/avatarAnimationController';
import { AnimationType, AvatarState } from '../types/avatar';

// Animation file imports
const animationFiles = {
  idle: require('../../assets/animations/avatar-idle.json'),
  listening: require('../../assets/animations/avatar-listening.json'),
  talking: require('../../assets/animations/avatar-talking.json'),
  thinking: require('../../assets/animations/avatar-thinking.json'),
};

interface AvatarContainerProps {
  onAnimationChange?: (state: AvatarState) => void;
  initialAnimation?: AnimationType;
  style?: any;
}

export const AvatarContainer = React.forwardRef<AvatarAnimationControllerImpl, AvatarContainerProps>(({
  onAnimationChange,
  initialAnimation = 'idle',
  style,
}, ref) => {
  const animationRef = useRef<LottieView>(null);
  const controllerRef = useRef<AvatarAnimationControllerImpl | null>(null);
  const [currentState, setCurrentState] = useState<AvatarState>({
    currentAnimation: initialAnimation,
    isAnimating: false,
  });

  // Initialize animation controller (only once)
  useEffect(() => {
    const handleAnimationChange = (animation: AnimationType, isAnimating: boolean) => {
      console.log(`AvatarContainer: Animation change callback - ${animation}, animating: ${isAnimating}`);
      const newState: AvatarState = {
        currentAnimation: animation,
        isAnimating,
      };
      setCurrentState(newState);
      onAnimationChange?.(newState);
    };

    console.log('AvatarContainer: Creating new animation controller');
    controllerRef.current = new AvatarAnimationControllerImpl(handleAnimationChange);
    console.log('AvatarContainer: Animation controller created');

    return () => {
      controllerRef.current?.stopAllAnimations();
    };
  }, []); // Empty dependency array - only run once

  // Update the callback when onAnimationChange changes
  useEffect(() => {
    if (controllerRef.current) {
      const handleAnimationChange = (animation: AnimationType, isAnimating: boolean) => {
        console.log(`AvatarContainer: Animation change callback - ${animation}, animating: ${isAnimating}`);
        const newState: AvatarState = {
          currentAnimation: animation,
          isAnimating,
        };
        setCurrentState(newState);
        onAnimationChange?.(newState);
      };
      
      // Update the callback in the controller
      controllerRef.current.setOnAnimationChange(handleAnimationChange);
    }
  }, [onAnimationChange]);

  // Debug animation state changes
  useEffect(() => {
    console.log(`AvatarContainer: Animation state changed to: ${currentState.currentAnimation}, animating: ${currentState.isAnimating}`);
  }, [currentState.currentAnimation, currentState.isAnimating]);

  // Set animation ref when both controller and ref are available
  useEffect(() => {
    if (controllerRef.current && animationRef.current) {
      console.log('AvatarContainer: Setting animation ref on controller');
      controllerRef.current.setAnimationRef(animationRef.current);
    }
  }, [animationRef.current]); // Only depend on animationRef.current

  const handleAnimationFinish = () => {
    controllerRef.current?.onAnimationFinish();
  };

  // Expose controller methods through ref
  React.useImperativeHandle(ref, () => {
    console.log('AvatarContainer: useImperativeHandle called, controller exists:', !!controllerRef.current);
    if (!controllerRef.current) {
      console.log('AvatarContainer: WARNING - Controller not ready, creating fallback');
      // Create a fallback controller if one doesn't exist
      const fallbackController = new AvatarAnimationControllerImpl();
      controllerRef.current = fallbackController;
    }
    return controllerRef.current;
  }, [controllerRef.current]); // Depend on controllerRef.current to update when it changes

  return (
    <View style={[styles.container, style]}>
      <LottieView
        key={currentState.currentAnimation} // Force re-render when animation changes
        ref={animationRef}
        source={animationFiles[currentState.currentAnimation]}
        autoPlay={true}
        loop={currentState.currentAnimation !== 'thinking'} // Thinking animation doesn't loop
        style={styles.animation}
        onAnimationFinish={handleAnimationFinish}
        resizeMode="contain"
      />
    </View>
  );
});

// Export controller for external access
export const useAvatarController = (containerRef: React.RefObject<AvatarAnimationControllerImpl>) => {
  return {
    playIdleAnimation: () => {
      console.log('useAvatarController: playIdleAnimation called, controller exists:', !!containerRef.current);
      containerRef.current?.playIdleAnimation();
    },
    playListeningAnimation: () => {
      console.log('useAvatarController: playListeningAnimation called, controller exists:', !!containerRef.current);
      containerRef.current?.playListeningAnimation();
    },
    playTalkingAnimation: () => {
      console.log('useAvatarController: playTalkingAnimation called, controller exists:', !!containerRef.current);
      containerRef.current?.playTalkingAnimation();
    },
    playThinkingAnimation: () => {
      console.log('useAvatarController: playThinkingAnimation called, controller exists:', !!containerRef.current);
      containerRef.current?.playThinkingAnimation();
    },
    stopAllAnimations: () => containerRef.current?.stopAllAnimations(),
    setAnimationSpeed: (speed: number) => containerRef.current?.setAnimationSpeed(speed),
    syncWithSpeech: (duration: number) => containerRef.current?.syncWithSpeech(duration),
    syncWithSpeechText: (text: string, duration?: number) => containerRef.current?.syncWithSpeechText(text, duration),
    startListeningMode: (maxDuration?: number) => containerRef.current?.startListeningMode(maxDuration),
    getCurrentAnimation: () => containerRef.current?.getCurrentAnimation(),
    isAnimating: () => containerRef.current?.isAnimating(),
  };
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  animation: {
    width: Math.min(width * 0.95, 400),
    height: Math.min(height * 0.7, 500),
  },
});