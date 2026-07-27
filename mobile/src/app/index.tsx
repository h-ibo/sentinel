import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Modal, ScrollView, Alert as RNAlert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import websocketService from '../services/websocket';
import { useAuth } from '@/context/AuthContext';

const API_URL = 'http://localhost:8000';

type Severity = 'critical' | 'high' | 'medium' | 'low';

type Alert = {
  id: string;
  cve_id: string;
  severity: Severity;
  package_name: string;
  affected_version: string;
  fixed_version: string | null;
  description: string;
  detected_at: string;
};

type VulnerabilityFromApi = {
  id: number;
  cve_id: string;
  severity: Severity;
  package_name: string;
  affected_version: string;
  fixed_version: string | null;
  description: string;
  detected_at: string;
};

const SEVERITY_COLORS: Record<Severity, { bg: string; border: string; text: string }> = {
  critical: { bg: '#ffebee', border: '#ef5350', text: '#b71c1c' },
  high: { bg: '#fff3e0', border: '#ffa726', text: '#e65100' },
  medium: { bg: '#fffde7', border: '#ffee58', text: '#f57f17' },
  low: { bg: '#f1f8e9', border: '#9ccc65', text: '#33691e' },
};

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return 'az önce';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dakika önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

function formatFullDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`${API_URL}/vulnerabilities/?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;

        const data: VulnerabilityFromApi[] = await response.json();
        const historyAlerts: Alert[] = data.map((item) => ({
          id: `history-${item.id}`,
          cve_id: item.cve_id,
          severity: item.severity,
          package_name: item.package_name,
          affected_version: item.affected_version,
          fixed_version: item.fixed_version,
          description: item.description,
          detected_at: item.detected_at,
        }));
        historyAlerts.reverse();
        setAlerts(historyAlerts);
      } catch (err) {
        console.log('Error fetching history:', err);
      }
    }

    fetchHistory();

    websocketService.connect(token);
    websocketService.onMessage((message: string) => {
      try {
        const parsed = JSON.parse(message);
        setAlerts((prevAlerts) => [
          {
            id: `live-${parsed.id || Date.now()}`,
            cve_id: parsed.cve_id,
            severity: parsed.severity,
            package_name: parsed.package_name,
            affected_version: parsed.affected_version,
            fixed_version: parsed.fixed_version,
            description: parsed.description,
            detected_at: parsed.detected_at,
          },
          ...prevAlerts,
        ]);
      } catch {
        console.log('Could not parse WebSocket message:', message);
      }
    });
  }, [token]);

  const handleScanUpload = async () => {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', '*/*'],
      });

      if (pickerResult.canceled) return;

      const file = pickerResult.assets[0];
      setIsUploading(true);

      const uriResponse = await fetch(file.uri);
      const blob = await uriResponse.blob();

      const formData = new FormData();
      formData.append('file', blob, file.name || 'requirements.txt');

      const response = await fetch(`${API_URL}/scan/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        RNAlert.alert('Tarama Başlatıldı 🛡️', `Dosya sunucuya yüklendi ve kuyruğa eklendi. (Görev ID: ${data.task_id.substring(0, 8)}...)`);
      } else {
        RNAlert.alert('Hata', 'Dosya yüklenemedi.');
      }
    } catch (error: any) {
      console.log('Upload error:', error);
      RNAlert.alert('Hata', `Bir hata oluştu: ${error.message || error}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sentinel Zafiyet Yönetim Paneli</Text>

      {/* Yükleme Butonu ve Durum Göstergesi */}
      <Pressable 
        style={[styles.uploadButton, isUploading && { opacity: 0.8 }]} 
        onPress={handleScanUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.uploadButtonText}> Dosya Yükleniyor ve Taranıyor...</Text>
          </View>
        ) : (
          <Text style={styles.uploadButtonText}>📁 requirements.txt Yükle ve Tara</Text>
        )}
      </Pressable>

      {alerts.length === 0 ? (
        <Text style={styles.emptyText}>Şu an tespit edilen yeni bir zafiyet yok. Sistem dinleniyor...</Text>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const colors = SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.low;
            return (
              <Pressable onPress={() => setSelectedAlert(item)}>
                <View style={[styles.alertCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={styles.alertRow}>
                    <Text style={[styles.cveId, { color: colors.text }]}>{item.cve_id}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.border }]}>
                      <Text style={styles.badgeText}>{item.severity.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.timeText}>{timeAgo(item.detected_at)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal
        visible={selectedAlert !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedAlert(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAlert && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalCveId}>{selectedAlert.cve_id}</Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: SEVERITY_COLORS[selectedAlert.severity].border },
                    ]}>
                    <Text style={styles.badgeText}>{selectedAlert.severity.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Paket</Text>
                  <Text style={styles.modalValue}>{selectedAlert.package_name}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Etkilenen versiyon</Text>
                  <Text style={styles.modalValue}>{selectedAlert.affected_version}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Düzeltilmiş versiyon</Text>
                  <Text style={styles.modalValue}>
                    {selectedAlert.fixed_version ?? 'Henüz yok'}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Tespit tarihi</Text>
                  <Text style={styles.modalValue}>{formatFullDate(selectedAlert.detected_at)}</Text>
                </View>

                <Text style={styles.modalLabel}>Açıklama</Text>
                <Text style={styles.modalDescription}>{selectedAlert.description}</Text>

                <Pressable style={styles.closeButton} onPress={() => setSelectedAlert(null)}>
                  <Text style={styles.closeButtonText}>Kapat</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 80, paddingHorizontal: 20 },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#1a1a1a' },
  uploadButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  uploadButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  emptyText: { fontSize: 16, color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  alertCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cveId: { fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  timeText: { fontSize: 13, color: '#666', marginTop: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCveId: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalLabel: { fontSize: 14, color: '#666', marginTop: 12 },
  modalValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  modalDescription: { fontSize: 15, color: '#333', lineHeight: 22, marginTop: 8 },
  closeButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  closeButtonText: { color: '#fff', fontWeight: '600' },
});