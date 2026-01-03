# BizFlow Mobile Technology Stack

## Framework Recommendation: React Native + Expo

### Why React Native with Expo?

| Criteria | React Native + Expo | Flutter | Native (Swift/Kotlin) |
|----------|---------------------|---------|----------------------|
| Code Sharing | 95%+ iOS/Android | 95%+ iOS/Android | 0% |
| Team Expertise | Leverages existing React/TS | New language (Dart) | Two separate teams |
| Time to Market | Fast | Fast | Slow |
| Performance | Near-native | Near-native | Native |
| OTA Updates | Yes (EAS Update) | Limited | No |
| Bundle Size | Medium (~15MB) | Larger (~20MB) | Smallest |
| Ecosystem | Mature, large | Growing | Mature |

**Recommendation: React Native + Expo** for optimal balance of development speed, code reuse with existing web platform, and native performance.

---

## Core Technology Stack

### Runtime & Build

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo SDK | 52+ | Managed React Native workflow |
| React Native | 0.76+ | Cross-platform UI framework |
| TypeScript | 5.x | Type-safe development |
| Node.js | 20 LTS | Development environment |

### Package Manager & Build Tools

```json
{
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## Dependencies

### Core Framework

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.0.0"
  }
}
```

### State Management

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.60.0",
    "zustand": "^5.0.0",
    "react-native-mmkv": "^3.1.0"
  }
}
```

**Architecture:**
- **TanStack Query**: Server state (API data, caching, sync)
- **Zustand**: Client state (UI, preferences, offline queue)
- **MMKV**: High-performance persistent storage (10x faster than AsyncStorage)

### Styling

```json
{
  "dependencies": {
    "nativewind": "^4.1.0",
    "tailwindcss": "^3.4.0"
  }
}
```

### Navigation

```json
{
  "dependencies": {
    "expo-router": "~4.0.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0"
  }
}
```

---

## Secure API Communication

### HTTP Client: Axios with Security Interceptors

```json
{
  "dependencies": {
    "axios": "^1.7.0"
  }
}
```

### Implementation

```typescript
// src/services/api/secureClient.ts

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

interface SecureApiConfig {
  baseURL: string;
  timeout: number;
  enableCertificatePinning: boolean;
}

class SecureApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor(config: SecureApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Platform': 'mobile',
        'X-App-Version': Constants.expoConfig?.version || '1.0.0',
        'X-Build-Number': Constants.expoConfig?.ios?.buildNumber || 
                          Constants.expoConfig?.android?.versionCode || '1',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Get fresh token
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Add timestamp to prevent replay attacks
        config.headers['X-Timestamp'] = Date.now().toString();

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 - attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.client(originalRequest);
          }

          // Refresh failed - trigger logout
          await this.handleAuthFailure();
        }

        return Promise.reject(error);
      }
    );
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken;
    }
    return SecureStore.getItemAsync('access_token');
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) return false;

      const response = await axios.post(
        `${this.client.defaults.baseURL}/auth/refresh`,
        { refreshToken }
      );

      const { accessToken, refreshToken: newRefresh } = response.data;
      
      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', newRefresh);
      
      this.accessToken = accessToken;
      return true;
    } catch {
      return false;
    }
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async handleAuthFailure(): Promise<void> {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    this.accessToken = null;
    // Emit logout event
  }

  // Public API methods
  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  setTenantId(tenantId: string): void {
    this.client.defaults.headers.common['X-Tenant-ID'] = tenantId;
  }
}

export const api = new SecureApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL!,
  timeout: 30000,
  enableCertificatePinning: process.env.EXPO_PUBLIC_ENV === 'production',
});
```

### Certificate Pinning (Production)

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    
    <domain-config>
        <domain includeSubdomains="true">api.bizflow.app</domain>
        <pin-set expiration="2025-12-31">
            <pin digest="SHA-256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</pin>
            <pin digest="SHA-256">BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

### Secure Storage Dependencies

```json
{
  "dependencies": {
    "expo-secure-store": "~14.0.0",
    "expo-crypto": "~14.0.0"
  }
}
```

---

## Push Notifications

### Dependencies

```json
{
  "dependencies": {
    "expo-notifications": "~0.29.0",
    "expo-device": "~7.0.0",
    "expo-constants": "~17.0.0"
  }
}
```

### Push Notification Service

```typescript
// src/services/notifications/PushService.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/secureClient';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface PushTokenRegistration {
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
  deviceName: string;
}

class PushNotificationService {
  private pushToken: string | null = null;
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;

  async initialize(): Promise<void> {
    // Register for push notifications
    await this.registerForPushNotifications();
    
    // Set up listeners
    this.setupListeners();
  }

  async registerForPushNotifications(): Promise<string | null> {
    // Must be a physical device
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device');
      return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission denied');
      return null;
    }

    // Get push token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.pushToken = tokenData.data;

      // Register with backend
      await this.registerTokenWithBackend();

      // Android-specific channel setup
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return this.pushToken;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  private async registerTokenWithBackend(): Promise<void> {
    if (!this.pushToken) return;

    const registration: PushTokenRegistration = {
      token: this.pushToken,
      platform: Platform.OS as 'ios' | 'android',
      deviceId: Device.deviceId || 'unknown',
      deviceName: Device.deviceName || 'Unknown Device',
    };

    await api.post('/notifications/devices', registration);
  }

  private async setupAndroidChannels(): Promise<void> {
    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });

    // Booking reminders
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Booking Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'notification.wav',
    });

    // Chat messages
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  private setupListeners(): void {
    // Notification received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // Handle in-app notification display
      }
    );

    // User tapped on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        this.handleNotificationTap(data);
      }
    );
  }

  private handleNotificationTap(data: any): void {
    // Navigate based on notification type
    const { type, entityId, screen } = data;

    switch (type) {
      case 'booking_reminder':
        // Navigate to booking details
        break;
      case 'new_message':
        // Navigate to chat
        break;
      case 'payment_received':
        // Navigate to payment details
        break;
      default:
        // Navigate to notifications list
        break;
    }
  }

  async unregisterDevice(): Promise<void> {
    if (this.pushToken) {
      await api.delete(`/notifications/devices/${this.pushToken}`);
      this.pushToken = null;
    }
  }

  cleanup(): void {
    this.notificationListener?.remove();
    this.responseListener?.remove();
  }
}

export const pushService = new PushNotificationService();
```

### Local Notifications (Offline Support)

```typescript
// Schedule local notification
async function scheduleBookingReminder(booking: Booking): Promise<void> {
  const trigger = new Date(booking.startTime);
  trigger.setMinutes(trigger.getMinutes() - 30); // 30 min before

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming Appointment',
      body: `Your appointment with ${booking.customerName} is in 30 minutes`,
      data: { 
        type: 'booking_reminder',
        bookingId: booking.id,
      },
    },
    trigger,
  });
}
```

---

## Environment Configuration

### Environment Files

```
mobile/
├── .env                    # Default/development
├── .env.staging            # Staging environment
├── .env.production         # Production environment
└── app.config.ts           # Dynamic Expo config
```

### Environment Variables

```bash
# .env.development
EXPO_PUBLIC_API_URL=https://dev-api.bizflow.app
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_ANALYTICS_ID=

# .env.staging
EXPO_PUBLIC_API_URL=https://staging-api.bizflow.app
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
EXPO_PUBLIC_ANALYTICS_ID=UA-STAGING

# .env.production
EXPO_PUBLIC_API_URL=https://api.bizflow.app
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
EXPO_PUBLIC_ANALYTICS_ID=UA-PRODUCTION
```

### Dynamic App Configuration

```typescript
// app.config.ts

import { ExpoConfig, ConfigContext } from 'expo/config';

const ENV = process.env.EXPO_PUBLIC_ENV || 'development';

const envConfig = {
  development: {
    name: 'BizFlow Dev',
    identifier: 'app.bizflow.dev',
    icon: './assets/icon-dev.png',
  },
  staging: {
    name: 'BizFlow Staging',
    identifier: 'app.bizflow.staging',
    icon: './assets/icon-staging.png',
  },
  production: {
    name: 'BizFlow',
    identifier: 'app.bizflow',
    icon: './assets/icon.png',
  },
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: envConfig[ENV].name,
  slug: 'bizflow',
  version: '1.0.0',
  orientation: 'portrait',
  icon: envConfig[ENV].icon,
  scheme: 'bizflow',
  
  ios: {
    bundleIdentifier: envConfig[ENV].identifier,
    supportsTablet: true,
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSFaceIDUsageDescription: 'Use Face ID to securely log in',
      NSCameraUsageDescription: 'Take photos for your profile and documents',
    },
  },
  
  android: {
    package: envConfig[ENV].identifier,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#3B82F6',
    },
    permissions: [
      'CAMERA',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
    ],
  },
  
  extra: {
    eas: {
      projectId: 'your-project-id',
    },
    environment: ENV,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
  
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#3B82F6',
        sounds: ['./assets/sounds/notification.wav'],
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          minSdkVersion: 24,
          networkSecurityConfig: './network-security-config.xml',
        },
        ios: {
          deploymentTarget: '14.0',
        },
      },
    ],
  ],
  
  updates: {
    url: 'https://u.expo.dev/your-project-id',
    fallbackToCacheTimeout: 0,
  },
  
  runtimeVersion: {
    policy: 'appVersion',
  },
});
```

### EAS Build Profiles

```json
// eas.json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENV": "development"
      },
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "staging": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENV": "staging"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@bizflow.app",
        "ascAppId": "123456789"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

### Configuration Access in Code

```typescript
// src/config/index.ts

import Constants from 'expo-constants';

interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  buildNumber: string;
  isProduction: boolean;
  isDevelopment: boolean;
}

export const config: AppConfig = {
  apiUrl: Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000',
  environment: Constants.expoConfig?.extra?.environment || 'development',
  version: Constants.expoConfig?.version || '1.0.0',
  buildNumber: Constants.expoConfig?.ios?.buildNumber || 
               String(Constants.expoConfig?.android?.versionCode) || '1',
  isProduction: Constants.expoConfig?.extra?.environment === 'production',
  isDevelopment: Constants.expoConfig?.extra?.environment === 'development',
};

// Feature flags based on environment
export const features = {
  enableAnalytics: config.isProduction,
  enableCrashReporting: !config.isDevelopment,
  enableDebugMenu: config.isDevelopment,
  enableOfflineMode: true,
  enableBiometrics: true,
};
```

---

## Complete package.json

```json
{
  "name": "bizflow-mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "build:dev": "eas build --profile development",
    "build:staging": "eas build --profile staging",
    "build:prod": "eas build --profile production",
    "update": "eas update",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/native": "^7.0.0",
    "@tanstack/react-query": "^5.60.0",
    "axios": "^1.7.0",
    "expo": "~52.0.0",
    "expo-build-properties": "~0.13.0",
    "expo-constants": "~17.0.0",
    "expo-crypto": "~14.0.0",
    "expo-device": "~7.0.0",
    "expo-image": "~2.0.0",
    "expo-local-authentication": "~15.0.0",
    "expo-notifications": "~0.29.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-status-bar": "~2.0.0",
    "nativewind": "^4.1.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-mmkv": "^3.1.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~18.3.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "tailwindcss": "^3.4.0",
    "typescript": "~5.6.0"
  }
}
```

---

## Summary

| Category | Selection | Rationale |
|----------|-----------|-----------|
| **Framework** | React Native + Expo | Code reuse, OTA updates, mature ecosystem |
| **Language** | TypeScript | Type safety, consistency with web |
| **State** | TanStack Query + Zustand | Server/client state separation |
| **Storage** | MMKV + SecureStore | Performance + security |
| **Styling** | NativeWind | Tailwind consistency with web |
| **Navigation** | Expo Router | File-based, type-safe routing |
| **HTTP** | Axios | Interceptors, mature, reliable |
| **Push** | Expo Notifications | Cross-platform, easy setup |
| **Biometrics** | expo-local-authentication | Face ID, Touch ID, fingerprint |
