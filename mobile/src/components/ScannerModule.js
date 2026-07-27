import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
// Not: Mobil cihazdan dosya seçebilmek için projenin durumuna göre 
// 'expo-document-picker' veya 'react-native-document-picker' kütüphanesini kurman gerekir.
import * as DocumentPicker from 'expo-document-picker'; 

const ScannerModule = ({ userToken }) => {
  const [file, setFile] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState('IDLE'); // IDLE, UPLOADING, SCANNING, SUCCESS, ERROR
  const [results, setResults] = useState(null);

  // 1. AŞAMA: Telefondan Dosya Seçme
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain', // Sadece .txt dosyaları
      });
      
      if (result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
      }
    } catch (err) {
      console.log("Dosya seçimi iptal edildi veya hata oluştu", err);
    }
  };

  // 2. AŞAMA: Dosyayı Backend'e Gönderme
  const handleUpload = async () => {
    if (!file) {
      Alert.alert("Hata", "Lütfen önce bir requirements.txt dosyası seçin!");
      return;
    }

    setStatus('UPLOADING');
    
    // Mobil tarafta FormData oluşturma
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'text/plain',
    });

    try {
      const response = await fetch('http://10.0.2.2:8000/scan/upload', { // Emülatör için localhost yerine 10.0.2.2 kullanılır
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      if (data.task_id) {
        setTaskId(data.task_id);
        setStatus('SCANNING');
      }
    } catch (error) {
      console.error("Yükleme hatası:", error);
      setStatus('ERROR');
    }
  };

  // 3. AŞAMA: Tarama Durumunu Sorgulama
  useEffect(() => {
    let intervalId;

    if (status === 'SCANNING' && taskId) {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`http://10.0.2.2:8000/scan/status/${taskId}`, {
            headers: {
              'Authorization': `Bearer ${userToken}`
            }
          });
          
          const data = await response.json();

          if (data.status === 'SUCCESS') {
            setResults(data.results);
            setStatus('SUCCESS');
            clearInterval(intervalId);
          } else if (data.status === 'FAILURE') {
            setStatus('ERROR');
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error("Durum sorgulama hatası:", error);
        }
      }, 3000);
    }

    return () => clearInterval(intervalId);
  }, [status, taskId, userToken]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>🛡️ Sentinel Zafiyet Taraması</Text>

      {/* Dosya Seçme ve Yükleme Alanı */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.button} onPress={pickDocument}>
          <Text style={styles.buttonText}>
            {file ? `Seçildi: ${file.name}` : '📄 Dosya Seç (.txt)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.uploadButton]} 
          onPress={handleUpload}
          disabled={status === 'UPLOADING' || status === 'SCANNING'}
        >
          <Text style={styles.buttonText}>
            {status === 'UPLOADING' ? 'Yükleniyor...' : 'Taramayı Başlat'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Durum Mesajları */}
      {status === 'SCANNING' && (
        <View style={styles.statusBox}>
          <Text style={styles.scanningText}>⏳ Dosyanız OSV üzerinde taranıyor...</Text>
        </View>
      )}
      
      {status === 'ERROR' && (
        <View style={styles.statusBox}>
          <Text style={styles.errorText}>❌ Tarama sırasında bir hata oluştu.</Text>
        </View>
      )}

      {/* Sonuçların Listelenmesi */}
      {status === 'SUCCESS' && results && (
        <View style={styles.resultsContainer}>
          <Text style={styles.successTitle}>✅ Tarama Tamamlandı!</Text>
          {results.map((pkg, index) => (
            <View key={index} style={styles.resultCard}>
              <Text style={styles.pkgName}>{pkg.package} (v{pkg.version})</Text>
              {pkg.vulnerabilities_found > 0 ? (
                <Text style={styles.dangerText}>🚨 {pkg.vulnerabilities_found} Kritik Açık Bulundu!</Text>
              ) : (
                <Text style={styles.safeText}>🟢 Güvenli</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#111827' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#374151', paddingBottom: 10 },
  actionContainer: { marginBottom: 20 },
  button: { backgroundColor: '#374151', padding: 15, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  uploadButton: { backgroundColor: '#2563eb' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  statusBox: { padding: 15, borderRadius: 8, backgroundColor: '#1f2937', marginBottom: 20, alignItems: 'center' },
  scanningText: { color: '#60a5fa', fontWeight: '600' },
  errorText: { color: '#f87171', fontWeight: '600' },
  resultsContainer: { marginTop: 10, paddingBottom: 40 },
  successTitle: { fontSize: 20, color: '#4ade80', fontWeight: 'bold', marginBottom: 15 },
  resultCard: { backgroundColor: '#1f2937', padding: 15, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#4b5563' },
  pkgName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  dangerText: { color: '#f87171', fontWeight: 'bold' },
  safeText: { color: '#4ade80', fontWeight: 'bold' }
});

export default ScannerModule;