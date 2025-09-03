import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ScrollView,
  SafeAreaView,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { AvatarContainer, useAvatarController } from './AvatarContainer';
import { AvatarAnimationControllerImpl } from '../services/avatarAnimationController';
import { conversationFlowController } from '../services/conversationFlowController';
import { ConversationError } from '../services/conversationService';
import { Message } from '../types/conversation';

interface ConversationScreenProps {
  onNavigateToSettings?: () => void;
}

export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  onNavigateToSettings,
}) => {
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showTextDisplay, setShowTextDisplay] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  const avatarRef = useRef<AvatarAnimationControllerImpl | null>(null);
  const avatarController = useAvatarController(avatarRef as React.RefObject<AvatarAnimationControllerImpl>);
  
  // Debug avatar ref
  useEffect(() => {
    console.log('ConversationScreen: Avatar ref changed, controller exists:', !!avatarRef.current);
  }, [avatarRef.current]);
  const recordButtonScale = useRef(new Animated.Value(1)).current;
  const recordButtonOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Handle conversation errors
  const handleConversationError = (error: ConversationError) => {
    console.error('Conversation error:', error);
    
    let alertTitle = 'Error de Conversación';
    let alertMessage = error.message;
    
    switch (error.type) {
      case 'permission':
        alertTitle = 'Permiso de Micrófono Requerido';
        alertMessage = 'Por favor permite el acceso al micrófono para usar las funciones de voz.';
        break;
      case 'network':
        alertTitle = 'Error de Red';
        alertMessage = 'Por favor verifica tu conexión a internet e inténtalo de nuevo.';
        break;
      case 'api':
        alertTitle = 'Error del Servicio';
        alertMessage = 'Hubo un problema con el servicio de idiomas. Por favor inténtalo de nuevo.';
        break;
      case 'audio':
        alertTitle = 'Error de Audio';
        alertMessage = 'Hubo un problema con la grabación o reproducción de audio.';
        break;
    }

    Alert.alert(alertTitle, alertMessage, [
      { text: 'OK', onPress: () => setIsLoading(false) }
    ]);
  };

  // Set up speech callbacks for avatar animation and message updates
  useEffect(() => {
    console.log('ConversationScreen: Setting up speech callbacks, avatarController exists:', !!avatarController);
    
    conversationFlowController.onSpeechStart = () => {
      console.log('ConversationScreen: onSpeechStart called, playing talking animation');
      avatarController.playTalkingAnimation();
    };
    
    conversationFlowController.onSpeechEnd = () => {
      console.log('ConversationScreen: onSpeechEnd called, playing idle animation');
      avatarController.playIdleAnimation();
    };

    conversationFlowController.onMessageAdded = (message: Message) => {
      console.log('ConversationScreen: New message added:', message.role, message.content.substring(0, 50));
      updateMessages();
    };

    // Initialize speaker state from conversation flow controller


    return () => {
      conversationFlowController.onSpeechStart = undefined;
      conversationFlowController.onSpeechEnd = undefined;
      conversationFlowController.onMessageAdded = undefined;
    };
  }, []); // Remove avatarController dependency to prevent re-running on every render

  // Start conversation
  const handleStartConversation = async () => {
    try {
      setIsLoading(true);
      await conversationFlowController.startConversation();
      setIsConversationActive(true);
      setIsPaused(false);
      updateMessages();
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error) {
        handleConversationError(error as ConversationError);
      } else {
              handleConversationError({
        type: 'api',
        message: 'Error al iniciar la conversación',
        recoverable: true
      });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Pause conversation
  const handlePauseConversation = () => {
    conversationFlowController.pauseConversation();
    setIsPaused(true);
    avatarController.playIdleAnimation();
  };

  // Resume conversation
  const handleResumeConversation = () => {
    conversationFlowController.resumeConversation();
    setIsPaused(false);
    avatarController.playIdleAnimation();
  };

  // End conversation
  const handleEndConversation = () => {
    conversationFlowController.endConversation();
    setIsConversationActive(false);
    setIsRecording(false);
    setIsPaused(false);
    avatarController.playIdleAnimation();
    setMessages([]);
  };

  // Update messages from conversation controller
  const updateMessages = () => {
    const history = conversationFlowController.getConversationHistory();
    console.log('ConversationScreen: Updating messages, count:', history.length);
    setMessages(history);
  };

  // Handle record button press (start recording)
  const handleRecordStart = async () => {
    if (!isConversationActive || isPaused || isRecording) return;

    try {
      setIsLoading(true);
      setIsRecording(true);
      avatarController.playListeningAnimation();
      
      // Animate record button
      Animated.parallel([
        Animated.timing(recordButtonScale, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(recordButtonOpacity, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      await conversationFlowController.handleUserInput();
    } catch (error) {
      setIsRecording(false);
      avatarController.playIdleAnimation();
      
      // Reset button animation
      Animated.parallel([
        Animated.timing(recordButtonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(recordButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (error && typeof error === 'object' && 'type' in error) {
        handleConversationError(error as ConversationError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle record button release (stop recording)
  const handleRecordEnd = async () => {
    if (!isRecording) return;

    try {
      setIsLoading(true);
      avatarController.playThinkingAnimation();
      
      // Reset button animation
      pulseAnimation.stopAnimation();
      Animated.parallel([
        Animated.timing(recordButtonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(recordButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      await conversationFlowController.stopContinuousRecording();
      setIsRecording(false);
      
      // Messages are now updated automatically via onMessageAdded callback
      
    } catch (error) {
      setIsRecording(false);
      avatarController.playIdleAnimation();
      
      if (error && typeof error === 'object' && 'type' in error) {
        handleConversationError(error as ConversationError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle text display
  const handleToggleTextDisplay = () => {
    setShowTextDisplay(!showTextDisplay);
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Gradient */}
      <View style={styles.backgroundGradient}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
      </View>

      {/* Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, isConversationActive && !isPaused && styles.statusActive]} />
              <Text style={styles.statusText}>
                {!isConversationActive ? 'Listo para chatear' : isPaused ? 'Pausado' : 'Activo'}
              </Text>
            </View>
            
            {onNavigateToSettings && (
              <TouchableOpacity style={styles.settingsIcon} onPress={onNavigateToSettings}>
                <Text style={styles.settingsIconText}>⚙️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <AvatarContainer
          ref={avatarRef}
          onAnimationChange={(state) => {
            console.log('Avatar animation changed:', state);
          }}
          style={styles.avatar}
        />
        
        {/* Floating Action Buttons */}
        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={[styles.floatingButton, showTextDisplay && styles.floatingButtonActive]}
            onPress={handleToggleTextDisplay}
          >
            <Text style={styles.floatingButtonIcon}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Message Overlay */}
      {showTextDisplay && (
        <Animated.View style={styles.messageOverlay}>
          <View style={styles.messageHeader}>
                            <Text style={styles.messageHeaderText}>Conversación</Text>
            <TouchableOpacity onPress={handleToggleTextDisplay}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.messageContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messageContent}
          >
            {messages.map((message) => (
              <Animated.View
                key={message.id}
                style={[
                  styles.messageItem,
                  message.role === 'user' ? styles.userMessage : styles.assistantMessage
                ]}
              >
                <View style={styles.messageAvatar}>
                  <Text style={styles.messageAvatarText}>
                    {message.role === 'user' ? '👤' : '🤖'}
                  </Text>
                </View>
                <View style={styles.messageBubble}>
                  <Text style={styles.messageText}>{message.content}</Text>
                  <Text style={styles.messageTime}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {!isConversationActive ? (
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleStartConversation}
            disabled={isLoading}
          >
            <View style={styles.primaryButtonContent}>
              <Text style={styles.primaryButtonIcon}>🚀</Text>
              <Text style={styles.primaryButtonText}>
                                  {isLoading ? 'Iniciando...' : 'Comenzar a Aprender'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            {/* Record Button */}
            {!isPaused && (
              <Animated.View
                style={[
                  styles.recordButtonContainer,
                  {
                    transform: [{ scale: recordButtonScale }],
                    opacity: recordButtonOpacity,
                  }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    isRecording && styles.recordButtonActive,
                    isLoading && styles.recordButtonDisabled
                  ]}
                  onPressIn={handleRecordStart}
                  onPressOut={handleRecordEnd}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <View style={styles.recordButtonInner}>
                    <Text style={styles.recordButtonIcon}>
                      {isRecording ? '🔴' : '🎤'}
                    </Text>
                    <Text style={styles.recordButtonText}>
                      {isRecording ? 'Suelta para enviar' : 'Mantén presionado para hablar'}
                    </Text>
                  </View>
                  
                  {/* Pulse animation for recording */}
                  {isRecording && (
                    <Animated.View 
                      style={[
                        styles.recordPulse,
                        {
                          transform: [{ scale: pulseAnimation }],
                        }
                      ]} 
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Control Buttons */}
            <View style={styles.controlRow}>
              {!isPaused ? (
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.pauseButton]}
                  onPress={handlePauseConversation}
                  disabled={isLoading}
                >
                  <Text style={styles.secondaryButtonIcon}>⏸️</Text>
                  <Text style={styles.secondaryButtonText}>Pausar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.resumeButton]}
                  onPress={handleResumeConversation}
                  disabled={isLoading}
                >
                  <Text style={styles.secondaryButtonIcon}>▶️</Text>
                  <Text style={styles.secondaryButtonText}>Reanudar</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.secondaryButton, styles.endButton]}
                onPress={handleEndConversation}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonIcon}>⏹️</Text>
                                  <Text style={styles.secondaryButtonText}>Terminar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

// Get screen dimensions for responsive design
Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    opacity: 0.9,
  },
  gradientBottom: {
    flex: 1,
    backgroundColor: '#16213E',
    opacity: 0.8,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7280',
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIconText: {
    fontSize: 18,
  },
  avatarSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    flex: 1,
  },
  floatingActions: {
    position: 'absolute',
    top: 30,
    right: 24,
    flexDirection: 'column',
    alignItems: 'center',
  },
  floatingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  floatingButtonInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  floatingButtonSpaced: {
    marginTop: 12,
  },
  floatingButtonIcon: {
    fontSize: 20,
  },
  messageOverlay: {
    position: 'absolute',
    top: 100,
    left: 24,
    right: 24,
    bottom: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  messageHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  messageContainer: {
    flex: 1,
  },
  messageContent: {
    padding: 20,
    paddingTop: 10,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessage: {
    flexDirection: 'row-reverse',
  },
  assistantMessage: {
    flexDirection: 'row',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageAvatarText: {
    fontSize: 16,
  },
  messageBubble: {
    flex: 1,
    maxWidth: '75%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  bottomControls: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#6B7280',
    shadowOpacity: 0.1,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  recordButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
  },
  recordButtonActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  recordButtonDisabled: {
    backgroundColor: '#6B7280',
    shadowColor: '#6B7280',
    shadowOpacity: 0.2,
  },
  recordButtonInner: {
    alignItems: 'center',
  },
  recordButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  recordPulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    top: -10,
    left: -10,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginHorizontal: 24,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pauseButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  resumeButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  endButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  secondaryButtonIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  secondaryButtonText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '500',
  },
});