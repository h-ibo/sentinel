class WebSocketService {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 3000;
        this.onMessageCallback = null;
        this.token = null;
    }
    connect(token) {
        if (token) {
            this.token = token;
        }

        const WS_URL = `ws://localhost:8000/ws/alerts?token=${this.token}`;
        console.log('Bağlanılan URL:', WS_URL);

        this.ws = new WebSocket(WS_URL);
        this.ws.onopen = () => {
            console.log('✅ [Mobil] Telsiz Bağlantısı Kuruldu');
        };
        this.ws.onmessage = (event) => {
            console.log('🚨 [Mobil] Yeni Mesaj Geldi:', event.data);
            if (this.onMessageCallback) {
                this.onMessageCallback(event.data);
            }
        };
        this.ws.onclose = () => {
            console.log('⚠️ [Mobil] Bağlantı Koptu. 3 saniye sonra tekrar deneniyor...');
            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval);
        };
        this.ws.onerror = (error) => {
            console.log('❌ [Mobil] WebSocket Hatası: ', error);
            this.ws.close();
        };
    }
    onMessage(callback) {
        this.onMessageCallback = callback;
    }
}
const websocketService = new WebSocketService();
export default websocketService;