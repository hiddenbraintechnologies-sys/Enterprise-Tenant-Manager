# BizFlow Mobile App Architecture

## Overview

This document outlines the mobile application architecture for BizFlow, a multi-tenant SaaS business management platform. The mobile app provides a native experience on both Android and iOS using a single codebase approach.

## Technology Stack

### Framework: React Native with Expo

**Rationale:**
- Single codebase for Android & iOS with 95%+ code sharing
- Leverages existing React/TypeScript expertise from web platform
- Expo provides managed workflow with OTA updates
- Strong ecosystem with enterprise-grade libraries
- Excellent performance with native modules where needed

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Native + Expo                          │
├─────────────────────────────────────────────────────────────────┤
│  UI Layer          │  State Management  │  Native Modules       │
│  - React Native    │  - Zustand         │  - expo-secure-store  │
│  - NativeWind      │  - TanStack Query  │  - expo-local-auth    │
│  - React Navigation│  - MMKV Storage    │  - expo-notifications │
└─────────────────────────────────────────────────────────────────┘
```

### Core Dependencies

| Package | Purpose |
|---------|---------|
| `expo` | Managed React Native workflow |
| `expo-router` | File-based navigation |
| `nativewind` | Tailwind CSS for React Native |
| `@tanstack/react-query` | Server state management |
| `zustand` | Client state management |
| `react-native-mmkv` | High-performance storage |
| `expo-secure-store` | Encrypted credential storage |
| `expo-local-authentication` | Biometric authentication |
| `@react-native-community/netinfo` | Network state detection |

---

## Architecture Layers

```
┌────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Screens    │  │  Components  │  │    Hooks     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
├────────────────────────────────────────────────────────────────────┤
│                         APPLICATION LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Services   │  │  Use Cases   │  │   Managers   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
├────────────────────────────────────────────────────────────────────┤
│                           DOMAIN LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Entities   │  │ Repositories │  │    Types     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
├────────────────────────────────────────────────────────────────────┤
│                       INFRASTRUCTURE LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  API Client  │  │Local Storage │  │Native Modules│             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
mobile/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx
│   │   ├── tenant-select.tsx
│   │   └── biometric-setup.tsx
│   ├── (app)/                    # Main app screens (authenticated)
│   │   ├── (tabs)/               # Bottom tab navigation
│   │   │   ├── dashboard.tsx
│   │   │   ├── bookings.tsx
│   │   │   ├── customers.tsx
│   │   │   └── settings.tsx
│   │   └── [module]/             # Dynamic module routes
│   │       └── [...slug].tsx
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Entry point
│
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── index.ts
│   │   ├── forms/                # Form components
│   │   ├── layouts/              # Layout components
│   │   └── modules/              # Module-specific components
│   │       ├── clinic/
│   │       ├── salon/
│   │       ├── gym/
│   │       └── common/
│   │
│   ├── features/                 # Feature modules
│   │   ├── auth/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── stores/
│   │   ├── bookings/
│   │   ├── customers/
│   │   ├── inventory/
│   │   └── notifications/
│   │
│   ├── services/                 # Application services
│   │   ├── api/
│   │   │   ├── client.ts         # API client configuration
│   │   │   ├── interceptors.ts   # Request/response interceptors
│   │   │   └── endpoints/        # API endpoint definitions
│   │   ├── auth/
│   │   │   ├── AuthService.ts
│   │   │   ├── TokenManager.ts
│   │   │   └── BiometricService.ts
│   │   ├── sync/
│   │   │   ├── SyncManager.ts
│   │   │   └── ConflictResolver.ts
│   │   └── storage/
│   │       ├── SecureStorage.ts
│   │       └── OfflineStorage.ts
│   │
│   ├── stores/                   # Global state stores
│   │   ├── authStore.ts
│   │   ├── tenantStore.ts
│   │   ├── offlineStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useTenant.ts
│   │   ├── useOffline.ts
│   │   └── useBusinessModule.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── permissions.ts
│   │
│   ├── types/                    # TypeScript types
│   │   ├── api.ts
│   │   ├── entities.ts
│   │   └── navigation.ts
│   │
│   └── constants/                # App constants
│       ├── config.ts
│       ├── theme.ts
│       └── modules.ts
│
├── assets/                       # Static assets
├── app.json                      # Expo configuration
├── tailwind.config.js            # NativeWind configuration
└── package.json
```

---

## Authentication Architecture

### Secure Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Mobile    │────▶│   BizFlow   │────▶│   Identity  │
│    App      │◀────│    API      │◀────│   Provider  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │    JWT Tokens     │
       ▼                   │
┌─────────────┐            │
│   Secure    │            │
│   Storage   │◀───────────┘
└─────────────┘
```

### Token Management

```typescript
// src/services/auth/TokenManager.ts

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'bizflow_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'bizflow_refresh_token';
  
  // Store tokens securely using expo-secure-store
  async storeTokens(tokens: TokenPair): Promise<void> {
    await SecureStore.setItemAsync(
      this.ACCESS_TOKEN_KEY,
      tokens.accessToken
    );
    await SecureStore.setItemAsync(
      this.REFRESH_TOKEN_KEY,
      tokens.refreshToken
    );
  }
  
  // Retrieve access token with automatic refresh
  async getValidAccessToken(): Promise<string | null> {
    const accessToken = await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
    
    if (this.isTokenExpired(accessToken)) {
      return this.refreshAccessToken();
    }
    
    return accessToken;
  }
  
  // Automatic token refresh
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      return null;
    }
    
    try {
      const response = await api.post('/auth/refresh', { refreshToken });
      await this.storeTokens(response.data);
      return response.data.accessToken;
    } catch (error) {
      await this.clearTokens();
      return null;
    }
  }
}
```

### Biometric Authentication

```typescript
// src/services/auth/BiometricService.ts

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

class BiometricService {
  async isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }
  
  async authenticate(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access BizFlow',
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });
    
    return result.success;
  }
  
  async enableBiometricLogin(userId: string): Promise<void> {
    const biometricKey = await this.generateBiometricKey();
    await SecureStore.setItemAsync(
      `biometric_key_${userId}`,
      biometricKey,
      { requireAuthentication: true }
    );
  }
}
```

---

## Tenant-Aware Architecture

### Tenant Context

```typescript
// src/stores/tenantStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/services/storage/mmkvStorage';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  primaryColor: string;
  logoUrl: string | null;
  features: string[];
}

interface TenantState {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  
  setCurrentTenant: (tenant: Tenant) => void;
  setAvailableTenants: (tenants: Tenant[]) => void;
  switchTenant: (tenantId: string) => Promise<void>;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      currentTenant: null,
      availableTenants: [],
      isLoading: false,
      
      setCurrentTenant: (tenant) => {
        set({ currentTenant: tenant });
        // Update API client with tenant context
        apiClient.setTenantId(tenant.id);
      },
      
      switchTenant: async (tenantId) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/switch-tenant', { tenantId });
          const { tenant, tokens } = response.data;
          
          await TokenManager.storeTokens(tokens);
          set({ currentTenant: tenant, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      clearTenant: () => set({ currentTenant: null }),
    }),
    {
      name: 'tenant-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
```

### Tenant Selection Screen

```typescript
// app/(auth)/tenant-select.tsx

export default function TenantSelectScreen() {
  const { availableTenants, switchTenant, isLoading } = useTenantStore();
  const router = useRouter();
  
  const handleTenantSelect = async (tenant: Tenant) => {
    try {
      await switchTenant(tenant.id);
      router.replace('/(app)/dashboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to switch tenant');
    }
  };
  
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4">
        <Text className="text-2xl font-bold text-foreground">
          Select Business
        </Text>
        <Text className="text-muted-foreground mt-2">
          Choose which business you want to access
        </Text>
      </View>
      
      <FlatList
        data={availableTenants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TenantCard
            tenant={item}
            onPress={() => handleTenantSelect(item)}
          />
        )}
        contentContainerClassName="px-6 gap-3"
      />
    </SafeAreaView>
  );
}
```

---

## Business-Type Specific Modules

### Module Configuration

```typescript
// src/constants/modules.ts

export type BusinessType = 'clinic' | 'salon' | 'gym' | 'pg' | 'coworking' | 'service';

interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  screens: string[];
  offlineEnabled: boolean;
}

export const BUSINESS_MODULES: Record<BusinessType, ModuleConfig[]> = {
  clinic: [
    {
      id: 'patients',
      name: 'Patients',
      icon: 'users',
      screens: ['list', 'detail', 'history'],
      offlineEnabled: true,
    },
    {
      id: 'appointments',
      name: 'Appointments',
      icon: 'calendar',
      screens: ['calendar', 'create', 'detail'],
      offlineEnabled: true,
    },
    {
      id: 'prescriptions',
      name: 'Prescriptions',
      icon: 'file-text',
      screens: ['create', 'history'],
      offlineEnabled: false,
    },
    {
      id: 'emr',
      name: 'Medical Records',
      icon: 'clipboard',
      screens: ['list', 'detail', 'create'],
      offlineEnabled: false,
    },
  ],
  
  salon: [
    {
      id: 'appointments',
      name: 'Appointments',
      icon: 'calendar',
      screens: ['calendar', 'create', 'detail'],
      offlineEnabled: true,
    },
    {
      id: 'services',
      name: 'Services',
      icon: 'scissors',
      screens: ['list', 'detail'],
      offlineEnabled: true,
    },
    {
      id: 'staff',
      name: 'Staff',
      icon: 'users',
      screens: ['list', 'schedule'],
      offlineEnabled: true,
    },
  ],
  
  gym: [
    {
      id: 'members',
      name: 'Members',
      icon: 'users',
      screens: ['list', 'detail', 'checkin'],
      offlineEnabled: true,
    },
    {
      id: 'memberships',
      name: 'Memberships',
      icon: 'credit-card',
      screens: ['plans', 'assign'],
      offlineEnabled: false,
    },
    {
      id: 'classes',
      name: 'Classes',
      icon: 'activity',
      screens: ['schedule', 'enroll'],
      offlineEnabled: true,
    },
  ],
  
  // ... other business types
};
```

### Dynamic Module Loading

```typescript
// src/hooks/useBusinessModule.ts

export function useBusinessModule() {
  const { currentTenant } = useTenantStore();
  
  const availableModules = useMemo(() => {
    if (!currentTenant) return [];
    
    const businessModules = BUSINESS_MODULES[currentTenant.businessType] || [];
    
    // Filter by enabled features
    return businessModules.filter(module => 
      currentTenant.features.includes(module.id) || 
      currentTenant.features.includes('all')
    );
  }, [currentTenant]);
  
  const getModuleScreens = useCallback((moduleId: string) => {
    const module = availableModules.find(m => m.id === moduleId);
    return module?.screens || [];
  }, [availableModules]);
  
  const isModuleOfflineEnabled = useCallback((moduleId: string) => {
    const module = availableModules.find(m => m.id === moduleId);
    return module?.offlineEnabled || false;
  }, [availableModules]);
  
  return {
    availableModules,
    getModuleScreens,
    isModuleOfflineEnabled,
  };
}
```

### Module-Specific Navigation

```typescript
// app/(app)/(tabs)/_layout.tsx

export default function TabLayout() {
  const { availableModules } = useBusinessModule();
  const { currentTenant } = useTenantStore();
  
  // Generate tabs based on business type
  const tabs = useMemo(() => {
    const baseTabs = [
      { name: 'dashboard', icon: 'home' },
    ];
    
    // Add module-specific tabs
    const moduleTabs = availableModules
      .slice(0, 3) // Max 3 module tabs
      .map(module => ({
        name: module.id,
        icon: module.icon,
      }));
    
    return [
      ...baseTabs,
      ...moduleTabs,
      { name: 'settings', icon: 'settings' },
    ];
  }, [availableModules]);
  
  return (
    <Tabs>
      {tabs.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name={tab.icon} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
```

---

## Offline Support Architecture

### Offline Storage Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                      OFFLINE ARCHITECTURE                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   UI Layer      │───▶│   Repository    │                    │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                              │
│                    ┌─────────────┴─────────────┐               │
│                    ▼                           ▼               │
│           ┌───────────────┐          ┌───────────────┐         │
│           │  API Client   │          │ Local Storage │         │
│           │   (Online)    │          │  (Offline)    │         │
│           └───────────────┘          └───────────────┘         │
│                    │                           │               │
│                    └─────────────┬─────────────┘               │
│                                  ▼                              │
│                         ┌───────────────┐                      │
│                         │ Sync Manager  │                      │
│                         └───────────────┘                      │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Offline Store

```typescript
// src/stores/offlineStore.ts

import { MMKV } from 'react-native-mmkv';

interface PendingAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingActions: PendingAction[];
  lastSyncTimestamp: number | null;
  
  setOnlineStatus: (isOnline: boolean) => void;
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  removePendingAction: (id: string) => void;
  syncPendingActions: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      pendingActions: [],
      lastSyncTimestamp: null,
      
      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        if (isOnline) {
          // Trigger sync when coming back online
          get().syncPendingActions();
        }
      },
      
      addPendingAction: (action) => {
        const pendingAction: PendingAction = {
          ...action,
          id: generateId(),
          timestamp: Date.now(),
          retryCount: 0,
        };
        set(state => ({
          pendingActions: [...state.pendingActions, pendingAction],
        }));
      },
      
      syncPendingActions: async () => {
        const { pendingActions, isOnline } = get();
        
        if (!isOnline || pendingActions.length === 0) return;
        
        for (const action of pendingActions) {
          try {
            await SyncService.processAction(action);
            get().removePendingAction(action.id);
          } catch (error) {
            // Increment retry count, remove if exceeded
            if (action.retryCount >= 3) {
              get().removePendingAction(action.id);
              // Log failed action for manual resolution
            }
          }
        }
        
        set({ lastSyncTimestamp: Date.now() });
      },
    }),
    {
      name: 'offline-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
```

### Sync Manager

```typescript
// src/services/sync/SyncManager.ts

class SyncManager {
  private syncQueue: PendingAction[] = [];
  private isSyncing = false;
  
  // Process offline actions when back online
  async processAction(action: PendingAction): Promise<void> {
    const endpoint = this.getEndpoint(action);
    const method = this.getMethod(action.type);
    
    await apiClient.request({
      method,
      url: endpoint,
      data: action.payload,
      headers: {
        'X-Offline-Action-Id': action.id,
        'X-Offline-Timestamp': action.timestamp.toString(),
      },
    });
  }
  
  // Cache data for offline access
  async cacheForOffline(entity: string, data: any[]): Promise<void> {
    const storage = new OfflineStorage();
    await storage.set(`cache_${entity}`, {
      data,
      cachedAt: Date.now(),
    });
  }
  
  // Get cached data
  async getCachedData<T>(entity: string): Promise<T[] | null> {
    const storage = new OfflineStorage();
    const cached = await storage.get<{ data: T[]; cachedAt: number }>(`cache_${entity}`);
    
    if (!cached) return null;
    
    // Check if cache is still valid (24 hours)
    const isValid = Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000;
    return isValid ? cached.data : null;
  }
}
```

### Network-Aware Repository

```typescript
// src/services/repositories/BaseRepository.ts

abstract class BaseRepository<T> {
  protected abstract entity: string;
  protected abstract offlineEnabled: boolean;
  
  async getAll(): Promise<T[]> {
    const { isOnline } = useOfflineStore.getState();
    
    if (isOnline) {
      try {
        const response = await api.get(`/${this.entity}`);
        
        // Cache for offline if enabled
        if (this.offlineEnabled) {
          await SyncManager.cacheForOffline(this.entity, response.data);
        }
        
        return response.data;
      } catch (error) {
        // Fall back to cache on network error
        if (this.offlineEnabled) {
          const cached = await SyncManager.getCachedData<T>(this.entity);
          if (cached) return cached;
        }
        throw error;
      }
    } else {
      // Offline mode - return cached data
      if (!this.offlineEnabled) {
        throw new Error('This feature is not available offline');
      }
      
      const cached = await SyncManager.getCachedData<T>(this.entity);
      return cached || [];
    }
  }
  
  async create(data: Partial<T>): Promise<T> {
    const { isOnline, addPendingAction } = useOfflineStore.getState();
    
    if (isOnline) {
      const response = await api.post(`/${this.entity}`, data);
      return response.data;
    } else {
      if (!this.offlineEnabled) {
        throw new Error('This action is not available offline');
      }
      
      // Queue for sync
      const tempId = `temp_${Date.now()}`;
      addPendingAction({
        type: 'CREATE',
        entity: this.entity,
        payload: { ...data, tempId },
      });
      
      // Return optimistic response
      return { ...data, id: tempId } as T;
    }
  }
}
```

---

## API Client Configuration

### Secure API Client

```typescript
// src/services/api/client.ts

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { TokenManager } from '../auth/TokenManager';
import { useTenantStore } from '@/stores/tenantStore';
import { useOfflineStore } from '@/stores/offlineStore';

class ApiClient {
  private client: AxiosInstance;
  private tenantId: string | null = null;
  
  constructor() {
    this.client = axios.create({
      baseURL: process.env.EXPO_PUBLIC_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
        'X-Client-Version': Constants.expoConfig?.version || '1.0.0',
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token
        const token = await TokenManager.getValidAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add tenant context
        if (this.tenantId) {
          config.headers['X-Tenant-ID'] = this.tenantId;
        }
        
        // Add request ID for tracing
        config.headers['X-Request-ID'] = generateRequestId();
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 - try token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await TokenManager.refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed - logout user
            await AuthService.logout();
            throw refreshError;
          }
        }
        
        // Handle network errors
        if (!error.response) {
          useOfflineStore.getState().setOnlineStatus(false);
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }
  
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

---

## Security Best Practices

### 1. Secure Storage

```typescript
// All sensitive data stored using expo-secure-store
// - Access tokens
// - Refresh tokens
// - Biometric keys
// - User credentials (if remember me enabled)
```

### 2. Certificate Pinning

```typescript
// app.json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", {
        "android": {
          "networkSecurityConfig": "./network-security-config.xml"
        }
      }]
    ]
  }
}

// network-security-config.xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config>
    <domain includeSubdomains="true">api.bizflow.app</domain>
    <pin-set>
      <pin digest="SHA-256">base64EncodedPin==</pin>
      <pin digest="SHA-256">backupPin==</pin>
    </pin-set>
  </domain-config>
</network-security-config>
```

### 3. App Security Measures

```typescript
// Security configurations
const SECURITY_CONFIG = {
  // Session timeout (15 minutes inactive)
  sessionTimeoutMs: 15 * 60 * 1000,
  
  // Require biometric on app resume after timeout
  requireBiometricOnResume: true,
  
  // Prevent screenshots of sensitive screens
  preventScreenCapture: true,
  
  // Detect rooted/jailbroken devices
  detectRootedDevices: true,
  
  // Minimum required app version
  minRequiredVersion: '1.0.0',
};
```

### 4. Data Protection

```typescript
// Encrypt local data at rest
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({
  id: 'bizflow-secure',
  encryptionKey: await getDeviceEncryptionKey(),
});
```

---

## Push Notifications

```typescript
// src/services/notifications/PushNotificationService.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

class PushNotificationService {
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return null;
    }
    
    const token = await Notifications.getExpoPushTokenAsync();
    
    // Register token with backend
    await api.post('/notifications/register-device', {
      token: token.data,
      platform: Device.osName,
      deviceId: Device.deviceId,
    });
    
    return token.data;
  }
  
  setupNotificationHandlers(): void {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      // Show in-app notification
    });
    
    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Navigate to appropriate screen
      this.handleNotificationNavigation(data);
    });
  }
}
```

---

## Performance Optimizations

### 1. Image Optimization

```typescript
import { Image } from 'expo-image';

// Use expo-image for optimized image loading
<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

### 2. List Virtualization

```typescript
import { FlashList } from '@shopify/flash-list';

// Use FlashList for high-performance lists
<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={80}
  keyExtractor={item => item.id}
/>
```

### 3. Bundle Optimization

```typescript
// Use dynamic imports for large modules
const HeavyChart = lazy(() => import('@/components/HeavyChart'));

// Code split by route in expo-router (automatic)
```

---

## Testing Strategy

```typescript
// Unit tests with Jest
// Component tests with React Native Testing Library
// E2E tests with Detox

// Example component test
describe('LoginScreen', () => {
  it('shows error on invalid credentials', async () => {
    render(<LoginScreen />);
    
    fireEvent.changeText(screen.getByTestId('input-email'), 'invalid');
    fireEvent.changeText(screen.getByTestId('input-password'), 'short');
    fireEvent.press(screen.getByTestId('button-login'));
    
    await waitFor(() => {
      expect(screen.getByTestId('text-error')).toBeTruthy();
    });
  });
});
```

---

## Deployment

### Build & Release

```bash
# Development build
eas build --platform all --profile development

# Production build
eas build --platform all --profile production

# OTA update (no app store review needed)
eas update --branch production --message "Bug fixes"
```

### Environment Configuration

```typescript
// app.config.ts
export default {
  expo: {
    name: process.env.APP_ENV === 'production' ? 'BizFlow' : 'BizFlow Dev',
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      environment: process.env.APP_ENV,
    },
  },
};
```

---

## Summary

This mobile architecture provides:

1. **Cross-Platform Efficiency**: Single React Native codebase for iOS & Android
2. **Secure Authentication**: JWT tokens, biometrics, secure storage, certificate pinning
3. **Multi-Tenant Support**: Dynamic tenant switching, tenant-aware API calls
4. **Business-Type Modules**: Dynamic feature loading based on business type
5. **Offline Capability**: Local caching, action queuing, conflict resolution
6. **Performance**: Optimized lists, image caching, bundle splitting
7. **Security**: Encrypted storage, root detection, screenshot prevention
