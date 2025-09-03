import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { elevenLabsService, ElevenLabsVoice } from '../services/elevenLabsService';
import { AudioEmotion } from '../types/conversation';

// Translation mapping for common voice descriptions
const voiceDescriptionTranslations: { [key: string]: string } = {
  // Exact matches for common ElevenLabs descriptions
  'Warm and engaging voice, perfect for storytelling.': 'Voz cálida y atractiva, perfecta para contar historias.',
  'Clear and professional voice, ideal for business content.': 'Voz clara y profesional, ideal para contenido empresarial.',
  'Friendly and approachable voice with a warm tone.': 'Voz amigable y accesible con un tono cálido.',
  'Confident and authoritative voice for presentations.': 'Voz confiada y autoritaria para presentaciones.',
  'Soft and gentle voice, great for meditation content.': 'Voz suave y gentil, excelente para contenido de meditación.',
  'Energetic and enthusiastic voice for marketing.': 'Voz enérgica y entusiasta para marketing.',
  'Calm and soothing voice for relaxation content.': 'Voz calmada y relajante para contenido de relajación.',
  'Young and vibrant voice with natural delivery.': 'Voz joven y vibrante con entrega natural.',
  'Mature and experienced voice for educational content.': 'Voz madura y experimentada para contenido educativo.',
  'Articulate and clear voice for audiobooks.': 'Voz articulada y clara para audiolibros.',
  
  // Common patterns and words for partial matching
  'warm': 'cálida',
  'engaging': 'atractiva',
  'storytelling': 'narración',
  'clear': 'clara',
  'professional': 'profesional',
  'business': 'empresarial',
  'friendly': 'amigable',
  'approachable': 'accesible',
  'confident': 'confiada',
  'authoritative': 'autoritaria',
  'presentations': 'presentaciones',
  'soft': 'suave',
  'gentle': 'gentil',
  'meditation': 'meditación',
  'energetic': 'enérgica',
  'enthusiastic': 'entusiasta',
  'marketing': 'marketing',
  'calm': 'calmada',
  'soothing': 'relajante',
  'relaxation': 'relajación',
  'young': 'joven',
  'vibrant': 'vibrante',
  'natural': 'natural',
  'delivery': 'entrega',
  'mature': 'madura',
  'experienced': 'experimentada',
  'educational': 'educativo',
  'articulate': 'articulada',
  'audiobooks': 'audiolibros',
  'voice': 'voz',
  'perfect': 'perfecta',
  'ideal': 'ideal',
  'great': 'excelente',
  'content': 'contenido',
  'tone': 'tono',
  'with': 'con',
  'for': 'para',
  'and': 'y'
};

// Function to translate voice descriptions
const translateVoiceDescription = (description: string): string => {
  if (!description) return '';
  
  console.log('Original description:', description);
  
  // First check for exact matches
  if (voiceDescriptionTranslations[description]) {
    console.log('Found exact translation:', voiceDescriptionTranslations[description]);
    return voiceDescriptionTranslations[description];
  }
  
  // If no exact match, try to translate common words/phrases
  let translatedDescription = description;
  let changesMade = 0;
  
  // Replace common patterns (prioritize longer phrases first)
  const sortedTranslations = Object.entries(voiceDescriptionTranslations)
    .sort(([a], [b]) => b.length - a.length);
  
  sortedTranslations.forEach(([english, spanish]) => {
    if (english.length > 20) return; // Skip very long sentences
    
    const regex = new RegExp(`\\b${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const newDescription = translatedDescription.replace(regex, spanish);
    if (newDescription !== translatedDescription) {
      changesMade++;
      translatedDescription = newDescription;
    }
  });
  
  console.log('Translated description:', translatedDescription);
  console.log('Changes made:', changesMade);
  
  // If very few changes were made and description is still mostly English, 
  // provide a generic Spanish description
  if (changesMade < 2 && description.length > 20) {
    return 'Voz de alta calidad para conversación natural';
  }
  
  return translatedDescription;
};

interface EnhancedVoiceSelectorProps {
  language: string;
  selectedVoiceId?: string;
  onVoiceSelect: (voiceId: string, voiceName: string) => void;
  onPreview?: (voiceId: string) => void;
  showPreview?: boolean;
}

export const EnhancedVoiceSelector: React.FC<EnhancedVoiceSelectorProps> = ({
  language,
  selectedVoiceId,
  onVoiceSelect,
  onPreview,
  showPreview = true
}) => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVoices();
  }, [language]);

  const loadVoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const availableVoices = await elevenLabsService.getVoicesForLanguage(language);
      
      // Debug: Log actual voice descriptions
      console.log('Voice descriptions for debugging:');
      availableVoices.forEach(voice => {
        console.log(`${voice.name}: "${voice.description}"`);
      });
      
      setVoices(availableVoices);
      
      if (availableVoices.length === 0) {
        setError(`No hay voces disponibles para ${language}. Por favor verifica tu suscripción de ElevenLabs.`);
      }
    } catch (err) {
      console.error('Failed to load voices:', err);
      setError('Error al cargar las voces. Por favor verifica tu conexión a internet y tu clave API de ElevenLabs.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (voiceId: string, voiceName: string) => {
    if (previewingVoice) {
      Alert.alert('Vista Previa en Progreso', 'Por favor espera a que termine la vista previa actual.');
      return;
    }

    try {
      setPreviewingVoice(voiceId);
      
      if (onPreview) {
        onPreview(voiceId);
      } else {
        // Default preview behavior
        await elevenLabsService.previewVoice(voiceId, '', language);
      }
    } catch (err) {
      console.error('Voice preview failed:', err);
      Alert.alert(
        'Error en Vista Previa', 
        `No se pudo reproducir la vista previa de ${voiceName}. Por favor verifica tu conexión a internet.`,
        [{ text: 'OK' }]
      );
    } finally {
      setPreviewingVoice(null);
    }
  };

  const renderVoiceItem = ({ item }: { item: ElevenLabsVoice }) => {
    const isSelected = item.voice_id === selectedVoiceId;
    const isPreviewing = previewingVoice === item.voice_id;

    return (
      <View style={[styles.voiceItem, isSelected && styles.selectedVoiceItem]}>
        <TouchableOpacity
          style={styles.voiceInfo}
          onPress={() => onVoiceSelect(item.voice_id, item.name)}
          disabled={isPreviewing}
        >
          <Text style={[styles.voiceName, isSelected && styles.selectedVoiceName]}>
            {item.name}
          </Text>
          <Text style={styles.voiceDetails}>
            {item.language} • {item.gender || 'Desconocido'}
          </Text>
          {item.description && (
            <Text style={styles.voiceDescription} numberOfLines={2}>
              {translateVoiceDescription(item.description)}
            </Text>
          )}
        </TouchableOpacity>
        
        {showPreview && (
          <TouchableOpacity
            style={[styles.previewButton, isPreviewing && styles.previewingButton]}
            onPress={() => handlePreview(item.voice_id, item.name)}
            disabled={isPreviewing}
          >
            {isPreviewing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.previewButtonText}>Vista Previa</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando voces...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVoices}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seleccionar Voz para {language}</Text>
      <Text style={styles.subtitle}>
        {voices.length} voz{voices.length !== 1 ? 'es' : ''} disponible{voices.length !== 1 ? 's' : ''}
      </Text>
      
      <FlatList
        data={voices}
        renderItem={renderVoiceItem}
        keyExtractor={(item) => item.voice_id}
        style={styles.voiceList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  voiceList: {
    flex: 1,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedVoiceItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedVoiceName: {
    color: '#1976d2',
  },
  voiceDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  voiceDescription: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  previewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  previewingButton: {
    backgroundColor: '#666',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});