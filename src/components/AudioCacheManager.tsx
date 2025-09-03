import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { elevenLabsService } from '../services/elevenLabsService';

interface AudioCacheManagerProps {
  language?: string;
  cefrLevel?: string;
  onCacheUpdate?: (cacheSize: number) => void;
}

export const AudioCacheManager: React.FC<AudioCacheManagerProps> = ({
  language = 'english',
  cefrLevel = 'A1',
  onCacheUpdate
}) => {
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [preloading, setPreloading] = useState(false);

  useEffect(() => {
    updateCacheSize();
  }, []);

  const updateCacheSize = async () => {
    try {
      const size = await elevenLabsService.getCacheSize();
      setCacheSize(size);
      if (onCacheUpdate) {
        onCacheUpdate(size);
      }
    } catch (error) {
      console.error('Failed to get cache size:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Audio Cache',
      `This will delete ${formatBytes(cacheSize)} of cached audio files. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await elevenLabsService.clearAudioCache();
              await updateCacheSize();
              Alert.alert('Success', 'Audio cache cleared successfully.');
            } catch (error) {
              console.error('Failed to clear cache:', error);
              Alert.alert('Error', 'Failed to clear audio cache.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePreloadPhrases = async () => {
    try {
      setPreloading(true);
      await elevenLabsService.preloadCommonPhrases(language, cefrLevel);
      await updateCacheSize();
      Alert.alert(
        'Preloading Complete',
        `Common phrases for ${language} (${cefrLevel} level) have been cached for faster playback.`
      );
    } catch (error) {
      console.error('Failed to preload phrases:', error);
      Alert.alert(
        'Preloading Failed',
        'Could not preload common phrases. Please check your internet connection and ElevenLabs API key.'
      );
    } finally {
      setPreloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Cache Management</Text>
      
      <View style={styles.cacheInfo}>
        <Text style={styles.cacheLabel}>Cache Size:</Text>
        <Text style={styles.cacheSize}>{formatBytes(cacheSize)}</Text>
      </View>
      
      <Text style={styles.description}>
        Cached audio files improve performance by reducing API calls and providing faster playback.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.preloadButton]}
          onPress={handlePreloadPhrases}
          disabled={preloading}
        >
          {preloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Preload Common Phrases
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearCache}
          disabled={loading || cacheSize === 0}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Clear Cache
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.hint}>
        Preloading is recommended for offline usage or slow connections.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  cacheInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  cacheLabel: {
    fontSize: 16,
    color: '#666',
  },
  cacheSize: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  preloadButton: {
    backgroundColor: '#28a745',
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});