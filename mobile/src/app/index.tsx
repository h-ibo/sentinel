import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import websocketService from '../services/websocket'; 

export default function Dashboard() {
  const [alerts, setAlerts] = useState<{ id: string, text: string }[]>([]);

  useEffect(() => {
    // 1. Ekran açıldığında telsizi çalıştır
    websocketService.connect();

    // 2. Telsizden yeni bir anons geldiğinde bunu ekrandaki listeye ekle
    websocketService.onMessage((message: string) => {
      setAlerts((prevAlerts) => [
        { id: Date.now().toString(), text: message },
        ...prevAlerts,
      ]);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sentinel Zafiyet Yönetim Paneli</Text>
      
      {alerts.length === 0 ? (
        <Text style={styles.emptyText}>Şu an tespit edilen yeni bir zafiyet yok. Sistem dinleniyor...</Text>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.alertCard}>
              <Text style={styles.alertText}>{item.text}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    paddingTop: 80, 
    paddingHorizontal: 20 
  },
  header: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#1a1a1a' 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#666', 
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40
  },
  alertCard: { 
    backgroundColor: '#ffebee', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#ffcdd2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  alertText: { 
    fontSize: 15, 
    color: '#c62828', 
    fontWeight: '600',
    lineHeight: 22
  }
});