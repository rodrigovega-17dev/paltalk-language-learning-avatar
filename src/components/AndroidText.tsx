import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';

/**
 * Android-optimized Text component that prevents text cut-off issues
 *
 * This component automatically applies Android-specific fixes:
 * - Removes font padding that can cause cut-off
 * - Sets proper line heights
 * - Handles text scaling consistently
 * - Uses simple text break strategy to prevent horizontal cut-off
 * - Adds padding to fix bold text accessibility setting bug (RN issue #15114)
 */

interface AndroidTextProps extends TextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
}

export const AndroidText: React.FC<AndroidTextProps> = ({ children, style, ...props }) => {
  // Extract fontSize from style to calculate optimal lineHeight
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style || {};
  const fontSize = flatStyle.fontSize || 14;
  const existingLineHeight = flatStyle.lineHeight;
  
  // Calculate optimal line height if not provided (1.4x fontSize is generally good for Android)
  const calculatedLineHeight = existingLineHeight || Math.ceil(fontSize * 1.4);
  
  const androidOptimizedStyle: TextStyle = {
    includeFontPadding: false, // Removes Android's default font padding
    textAlignVertical: 'center', // Ensures proper vertical alignment
    lineHeight: calculatedLineHeight,
    paddingRight: 1, // Fix for bold text accessibility setting causing cut-off (RN #15114)
    fontFamily: 'System', // Adding explicit fontFamily can fix cut-off issues on Android
    ...flatStyle,
  };

  return (
    <RNText
      {...props}
      style={androidOptimizedStyle}
      allowFontScaling={false} // Prevents system font scaling from breaking layout
      textBreakStrategy="simple" // Fix for horizontal text cut-off on Android
    >
      {children}
    </RNText>
  );
};

// Export as default for easy replacement
export default AndroidText;