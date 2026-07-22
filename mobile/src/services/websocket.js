class WebSocketService {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 3000; // 3 saniyede bir yeniden bağlanmayı deneyecek
        this.onMessageCallback = null;
    }

    connect() {
        // Tarayıcıda test ettiğimiz URL'in aynısı
        const WS_URL = 'ws://localhost:8000/ws/alerts';
        
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            console.log('✅ [Mobil] Telsiz Bağlantısı Kuruldu');
        };

        this.ws.onmessage = (event) => {
            console.log('🚨 [Mobil] Yeni Mesaj Geldi:', event.data);
            // Gelen mesajı React Native ekranına (Dashboard) iletiyoruz
            if (this.onMessageCallback) {
                this.onMessageCallback(event.data);
            }
        };

        this.ws.onclose = () => {
            console.log('⚠️ [Mobil] Bağlantı Koptu. 3 saniye sonra tekrar deneniyor...');
            // Kontrol listendeki "otomatik yeniden bağlanma" (reconnect) mantığı
            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval);
        };

        this.ws.onerror = (error) => {
            console.log('❌ [Mobil] WebSocket Hatası: ', error);
            // Hata durumunda bağlantıyı kapatıp onclose'u tetikliyoruz ki yeniden bağlanmayı denesin
            this.ws.close();
        };
    }

    // Dashboard ekranının bu servisi dinleyebilmesi için gerekli köprü
    onMessage(callback) {
        this.onMessageCallback = callback;
    }
}

// Tüm mobil uygulamanın aynı telsizi kullanması için tek bir örnek dışa aktarıyoruz
const websocketService = new WebSocketService();
export default websocketService;