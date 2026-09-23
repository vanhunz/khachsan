import axios from 'axios';
import { io } from 'socket.io-client';

const STORAGE_KEY_API_CONFIG = 'hotel_pos_network_config';

/**
 * Default network configuration
 */
const DEFAULT_CONFIG = {
  apiUrl: '', // e.g. 'http://192.168.1.50:5000/api' or cloud server
  socketUrl: '', // e.g. 'http://192.168.1.50:5000'
  apiKey: '',
  autoSync: false,
  syncIntervalMinutes: 5,
};

class NetworkService {
  constructor() {
    this.socket = null;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.config = this.loadConfig();
    this.syncListeners = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_API_CONFIG);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to load network config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEY_API_CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save network config:', e);
    }
    if (this.config.socketUrl) {
      this.initSocket(this.config.socketUrl);
    }
    return this.config;
  }

  handleNetworkChange(status) {
    this.isOnline = status;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('network-status-changed', {
          detail: { isOnline: this.isOnline },
        })
      );
    }
  }

  /**
   * Test connection to a remote server or API endpoint
   */
  async testConnection(targetUrl = this.config.apiUrl) {
    if (!targetUrl) {
      return { success: false, message: 'Chưa cấu hình địa chỉ máy chủ (URL)' };
    }
    try {
      const response = await axios.get(`${targetUrl.replace(/\/$/, '')}/health`, {
        timeout: 4000,
        headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {},
      });
      return {
        success: true,
        status: response.status,
        data: response.data,
        message: 'Kết nối máy chủ thành công!',
      };
    } catch (error) {
      // If /health doesn't exist, try a simple HEAD/GET on the root
      try {
        await axios.get(targetUrl, { timeout: 4000 });
        return { success: true, message: 'Đã liên lạc được với máy chủ!' };
      } catch (err2) {
        return {
          success: false,
          message: error.response
            ? `Máy chủ phản hồi lỗi HTTP ${error.response.status}`
            : 'Không thể kết nối đến địa chỉ mạng này (Timeout / Unreachable)',
          error: error.message,
        };
      }
    }
  }

  /**
   * Upload all local hotel data to Cloud/LAN Server
   */
  async syncToCloud(payload) {
    if (!this.config.apiUrl) {
      throw new Error('Chưa cấu hình địa chỉ Máy chủ API (apiUrl)');
    }
    try {
      const response = await axios.post(
        `${this.config.apiUrl.replace(/\/$/, '')}/sync/push`,
        payload,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
          },
        }
      );
      return response.data;
    } catch (err) {
      console.error('Push sync to cloud failed:', err);
      throw err;
    }
  }

  /**
   * Pull latest data from Cloud/LAN Server
   */
  async pullFromCloud() {
    if (!this.config.apiUrl) {
      throw new Error('Chưa cấu hình địa chỉ Máy chủ API (apiUrl)');
    }
    try {
      const response = await axios.get(
        `${this.config.apiUrl.replace(/\/$/, '')}/sync/pull`,
        {
          timeout: 10000,
          headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {},
        }
      );
      return response.data;
    } catch (err) {
      console.error('Pull sync from cloud failed:', err);
      throw err;
    }
  }

  /**
   * Initialize real-time WebSocket connection for multi-device sync
   */
  initSocket(socketUrl = this.config.socketUrl) {
    if (!socketUrl) return null;
    if (this.socket) {
      this.socket.disconnect();
    }

    try {
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        console.log('⚡ Socket connected to LAN/Cloud Server:', this.socket.id);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socket-status-changed', { detail: { connected: true } }));
        }
      });

      this.socket.on('disconnect', () => {
        console.log('⚡ Socket disconnected');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socket-status-changed', { detail: { connected: false } }));
        }
      });

      // Broadcast room changes to subscribers
      this.socket.on('hotel:state-update', (data) => {
        this.syncListeners.forEach((cb) => cb(data));
      });

      return this.socket;
    } catch (err) {
      console.error('Failed to initialize socket:', err);
      return null;
    }
  }

  /**
   * Broadcast local changes to other LAN/Cloud devices
   */
  emitStateUpdate(event, payload) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('hotel:client-update', { event, payload, timestamp: Date.now() });
    }
  }

  onStateUpdate(callback) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }
}

export const networkService = new NetworkService();
