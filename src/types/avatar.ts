// Avatar animation related types
export interface AvatarState {
  currentAnimation: 'idle' | 'listening' | 'talking' | 'thinking';
  isAnimating: boolean;
}

export type AnimationType = 'idle' | 'listening' | 'talking' | 'thinking';