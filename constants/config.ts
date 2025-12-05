import Constants from 'expo-constants';
import { Platform } from 'react-native';

let API_URL = 'http://localhost:3001';

// Example: override via .env (if using expo-constants extras)
if (Constants.expoConfig?.extra?.API_URL) {
  API_URL = Constants.expoConfig.extra.API_URL;
}

// Use LAN IP for devices (replace below with your computer's LAN IP)
if (Platform.OS !== 'web' && API_URL === 'http://localhost:3001') {
  API_URL = 'http://YOUR_LAN_IP:3001'; // <-- EDIT for your LAN dev
}

export { API_URL };
