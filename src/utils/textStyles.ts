import { TextStyle } from 'react-native';

/**
 * Android Text Fix Utility
 * 
 * This utility provides consistent text styling that works properly on real Android devices.
 * It addresses common issues like text cut-off, inconsistent line heights, and font padding.
 */

interface AndroidTextStyleOptions {
  fontSize: number;
  fontWeight?: TextStyle['fontWeight'];
  color?: string;
  textAlign?: TextStyle['textAlign'];
  marginBottom?: number;
  marginTop?: number;
}

/**
 * Creates Android-optimized text styles that prevent text cut-off issues
 */
export const createAndroidTextStyle = (options: AndroidTextStyleOptions): TextStyle => {
  const { fontSize, fontWeight, color, textAlign, marginBottom, marginTop } = options;
  
  // Calculate optimal line height (typically 1.3-1.5x font size)
  const lineHeight = Math.ceil(fontSize * 1.4);
  
  return {
    fontSize,
    lineHeight,
    includeFontPadding: false, // Removes Android's default font padding
    textAlignVertical: 'center', // Ensures proper vertical alignment
    ...(fontWeight && { fontWeight }),
    ...(color && { color }),
    ...(textAlign && { textAlign }),
    ...(marginBottom && { marginBottom }),
    ...(marginTop && { marginTop }),
  };
};

/**
 * Pre-defined text styles for common use cases
 */
export const androidTextStyles = {
  // Headers
  h1: createAndroidTextStyle({ fontSize: 28, fontWeight: 'bold', color: '#333' }),
  h2: createAndroidTextStyle({ fontSize: 24, fontWeight: '700', color: '#333' }),
  h3: createAndroidTextStyle({ fontSize: 18, fontWeight: '600', color: '#333' }),
  
  // Body text
  body: createAndroidTextStyle({ fontSize: 16, color: '#333' }),
  bodySecondary: createAndroidTextStyle({ fontSize: 14, color: '#666' }),
  caption: createAndroidTextStyle({ fontSize: 12, color: '#888' }),
  
  // Buttons
  buttonPrimary: createAndroidTextStyle({ fontSize: 18, fontWeight: '600', color: '#FFFFFF' }),
  buttonSecondary: createAndroidTextStyle({ fontSize: 16, fontWeight: '500', color: '#007AFF' }),
  buttonSmall: createAndroidTextStyle({ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }),
  
  // Status and labels
  label: createAndroidTextStyle({ fontSize: 16, fontWeight: '600', color: '#333' }),
  status: createAndroidTextStyle({ fontSize: 14, fontWeight: '500', color: '#E5E7EB' }),
  
  // Messages
  messageText: createAndroidTextStyle({ fontSize: 15, color: '#1F2937' }),
  messageTime: createAndroidTextStyle({ fontSize: 11, color: '#6B7280' }),
};

/**
 * Container styles that work well with Android text
 */
export const androidContainerStyles = {
  // Button containers with proper padding for text
  buttonContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    minHeight: 48, // Ensures touch target size
  },
  
  // Text input containers
  inputContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center' as const,
  },
  
  // Message bubble containers
  messageBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    maxWidth: '75%',
  },
};