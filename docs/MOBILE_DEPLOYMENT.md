# BizFlow Mobile App Deployment Guide

## Overview

This guide covers the complete deployment process for the BizFlow mobile app to both Google Play Store (Android) and Apple App Store (iOS), including environment separation and CI/CD configuration.

---

## Prerequisites

### Development Environment
- Node.js 20 LTS
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Xcode 15+ (for iOS builds)
- Android Studio (for local Android testing)

### Accounts Required
- [Expo Account](https://expo.dev) - Free tier available
- [Apple Developer Account](https://developer.apple.com) - $99/year
- [Google Play Developer Account](https://play.google.com/console) - $25 one-time

---

## Project Configuration

### 1. app.json / app.config.ts

```typescript
// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

const ENV = process.env.APP_ENV || 'development';

const configs = {
  development: {
    name: 'BizFlow Dev',
    bundleId: 'app.bizflow.dev',
    apiUrl: 'https://dev-api.bizflow.app',
    icon: './assets/icon-dev.png',
  },
  staging: {
    name: 'BizFlow Staging',
    bundleId: 'app.bizflow.staging',
    apiUrl: 'https://staging-api.bizflow.app',
    icon: './assets/icon-staging.png',
  },
  production: {
    name: 'BizFlow',
    bundleId: 'app.bizflow',
    apiUrl: 'https://api.bizflow.app',
    icon: './assets/icon.png',
  },
};

const config = configs[ENV as keyof typeof configs];

export default ({ config: baseConfig }: ConfigContext): ExpoConfig => ({
  ...baseConfig,
  name: config.name,
  slug: 'bizflow',
  version: '1.0.0',
  orientation: 'portrait',
  icon: config.icon,
  scheme: 'bizflow',
  userInterfaceStyle: 'automatic',
  
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#3B82F6',
  },
  
  assetBundlePatterns: ['**/*'],
  
  ios: {
    bundleIdentifier: config.bundleId,
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      NSFaceIDUsageDescription: 'Use Face ID to securely access your account',
      NSCameraUsageDescription: 'Take photos for documents and profile',
      NSPhotoLibraryUsageDescription: 'Select photos from your library',
      UIBackgroundModes: ['remote-notification'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
    associatedDomains: [
      `applinks:${config.apiUrl.replace('https://', '')}`,
    ],
  },
  
  android: {
    package: config.bundleId,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#3B82F6',
    },
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
    ],
    googleServicesFile: `./google-services-${ENV}.json`,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: config.apiUrl.replace('https://', ''),
            pathPrefix: '/app',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  
  extra: {
    eas: {
      projectId: 'your-expo-project-id',
    },
    environment: ENV,
    apiUrl: config.apiUrl,
  },
  
  owner: 'bizflow',
  
  updates: {
    url: 'https://u.expo.dev/your-expo-project-id',
    fallbackToCacheTimeout: 0,
  },
  
  runtimeVersion: {
    policy: 'appVersion',
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
        },
        ios: {
          deploymentTarget: '14.0',
        },
      },
    ],
  ],
});
```

### 2. eas.json (EAS Build Configuration)

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "base": {
      "node": "20.18.0",
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    },
    "development": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_ENV": "development",
        "EXPO_PUBLIC_ENV": "development"
      },
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "extends": "base",
      "distribution": "internal",
      "env": {
        "APP_ENV": "staging",
        "EXPO_PUBLIC_ENV": "staging"
      },
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "staging": {
      "extends": "base",
      "distribution": "internal",
      "env": {
        "APP_ENV": "staging",
        "EXPO_PUBLIC_ENV": "staging"
      },
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "resourceClass": "m-medium"
      },
      "channel": "staging"
    },
    "production": {
      "extends": "base",
      "distribution": "store",
      "env": {
        "APP_ENV": "production",
        "EXPO_PUBLIC_ENV": "production"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "resourceClass": "m-medium"
      },
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@bizflow.app",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./play-store-key.json",
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  }
}
```

---

## Environment Separation

### Environment Files

```
mobile/
├── .env.development      # Local development
├── .env.staging          # Staging/QA
├── .env.production       # Production
└── .env.local            # Local overrides (gitignored)
```

### .env.development
```bash
APP_ENV=development
EXPO_PUBLIC_API_URL=http://localhost:5000
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_ANALYTICS_ENABLED=false
```

### .env.staging
```bash
APP_ENV=staging
EXPO_PUBLIC_API_URL=https://staging-api.bizflow.app
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/staging
EXPO_PUBLIC_ANALYTICS_ENABLED=true
```

### .env.production
```bash
APP_ENV=production
EXPO_PUBLIC_API_URL=https://api.bizflow.app
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/production
EXPO_PUBLIC_ANALYTICS_ENABLED=true
```

### Configuration Service

```typescript
// src/config/index.ts
import Constants from 'expo-constants';

type Environment = 'development' | 'staging' | 'production';

interface Config {
  env: Environment;
  apiUrl: string;
  sentryDsn: string | null;
  analyticsEnabled: boolean;
  isProduction: boolean;
  version: string;
  buildNumber: string;
}

export const config: Config = {
  env: (Constants.expoConfig?.extra?.environment || 'development') as Environment,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || null,
  analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
  isProduction: Constants.expoConfig?.extra?.environment === 'production',
  version: Constants.expoConfig?.version || '1.0.0',
  buildNumber: Constants.expoConfig?.ios?.buildNumber || 
               String(Constants.expoConfig?.android?.versionCode) || '1',
};
```

---

## Android Play Store Release

### Step 1: Google Play Console Setup

1. **Create App in Play Console**
   - Go to [Google Play Console](https://play.google.com/console)
   - Click "Create app"
   - Fill in app details (name, language, app/game, free/paid)

2. **Complete Store Listing**
   - App name, short description, full description
   - Screenshots (phone, 7-inch tablet, 10-inch tablet)
   - Feature graphic (1024x500)
   - App icon (512x512)
   - Privacy policy URL

3. **Content Rating**
   - Complete the content rating questionnaire
   - Required for all apps

4. **Target Audience**
   - Set target age groups
   - Required for app approval

### Step 2: App Signing

1. **Create Upload Key** (for first upload)
   ```bash
   # Generate upload keystore
   keytool -genkeypair -v \
     -storetype PKCS12 \
     -keystore upload-keystore.jks \
     -alias upload \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000
   ```

2. **Configure in EAS**
   ```bash
   # EAS manages signing automatically
   eas credentials
   # Choose Android > production > Keystore
   ```

3. **Enable Play App Signing**
   - In Play Console: Setup > App signing
   - Upload your key or let Google generate one

### Step 3: Build for Play Store

```bash
# Build production AAB (Android App Bundle)
eas build --platform android --profile production

# Wait for build to complete
# Download the .aab file
```

### Step 4: Submit to Play Store

```bash
# Automatic submission
eas submit --platform android --profile production

# Or manual upload:
# 1. Go to Play Console > Production > Create new release
# 2. Upload .aab file
# 3. Add release notes
# 4. Review and rollout
```

### Step 5: Release Tracks

| Track | Purpose | Audience |
|-------|---------|----------|
| Internal testing | Team testing | Up to 100 testers |
| Closed testing | Beta testing | Selected testers via email |
| Open testing | Public beta | Anyone can join |
| Production | Public release | All users |

### Recommended Release Flow
```
Internal → Closed → Open → Production (staged rollout)
```

---

## iOS App Store Release

### Step 1: Apple Developer Setup

1. **Create App ID**
   - Go to [Apple Developer Portal](https://developer.apple.com)
   - Certificates, Identifiers & Profiles
   - Create new App ID matching your bundle identifier

2. **Create App in App Store Connect**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - My Apps > + > New App
   - Select bundle ID, name, primary language, SKU

3. **Configure Capabilities**
   - Push Notifications
   - Associated Domains (for deep linking)
   - Sign in with Apple (if applicable)

### Step 2: Certificates & Provisioning

```bash
# EAS handles this automatically
eas credentials

# Or manually:
# 1. Create Distribution Certificate
# 2. Create App Store Provisioning Profile
# 3. Upload to EAS or configure locally
```

### Step 3: Build for App Store

```bash
# Build production IPA
eas build --platform ios --profile production

# Wait for build to complete
```

### Step 4: App Store Metadata

**Required Screenshots:**
- 6.7" iPhone (1290 x 2796)
- 6.5" iPhone (1284 x 2778)
- 5.5" iPhone (1242 x 2208)
- 12.9" iPad Pro (2048 x 2732)

**Required Information:**
- App description (up to 4000 chars)
- Keywords (up to 100 chars)
- Support URL
- Privacy Policy URL
- Age rating questionnaire
- App category

### Step 5: Submit to App Store

```bash
# Automatic submission
eas submit --platform ios --profile production

# This will:
# 1. Upload to App Store Connect
# 2. Submit for review (if configured)
```

### Step 6: App Review

**Common Rejection Reasons:**
1. Incomplete functionality
2. Placeholder content
3. Crashes or bugs
4. Misleading metadata
5. Privacy policy issues

**Tips for Approval:**
- Test thoroughly before submission
- Provide demo account credentials
- Include clear app description
- Respond quickly to reviewer questions

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/mobile-deploy.yml
name: Mobile App Deploy

on:
  push:
    branches: [main]
    paths:
      - 'mobile/**'
      - '.github/workflows/mobile-deploy.yml'
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to build'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - ios
          - android
      profile:
        description: 'Build profile'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Run tests
        run: npm test

  build-android:
    needs: lint-and-test
    if: github.event.inputs.platform != 'ios'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json
      
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Android
        run: |
          PROFILE=${{ github.event.inputs.profile || 'staging' }}
          eas build --platform android --profile $PROFILE --non-interactive
      
      - name: Submit to Play Store
        if: github.event.inputs.profile == 'production'
        run: eas submit --platform android --profile production --non-interactive

  build-ios:
    needs: lint-and-test
    if: github.event.inputs.platform != 'android'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json
      
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build iOS
        run: |
          PROFILE=${{ github.event.inputs.profile || 'staging' }}
          eas build --platform ios --profile $PROFILE --non-interactive
      
      - name: Submit to App Store
        if: github.event.inputs.profile == 'production'
        run: eas submit --platform ios --profile production --non-interactive

  ota-update:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json
      
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Publish OTA Update
        run: |
          eas update --branch staging --message "${{ github.event.head_commit.message }}"
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | EAS access token |
| `APPLE_ID` | Apple Developer email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for Apple ID |
| `ASC_API_KEY_ID` | App Store Connect API Key ID |
| `ASC_API_KEY_ISSUER_ID` | API Key Issuer ID |
| `ASC_API_KEY_P8` | Private key (.p8 content) |

---

## Over-The-Air (OTA) Updates

### Enable OTA Updates

```bash
# Update staging channel
eas update --branch staging --message "Bug fixes and improvements"

# Update production channel
eas update --branch production --message "v1.0.1 - Performance improvements"
```

### OTA Update Strategy

```typescript
// src/hooks/useAppUpdates.ts
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useAppUpdates() {
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    if (__DEV__) return;
    
    try {
      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        
        Alert.alert(
          'Update Available',
          'A new version is available. Restart to apply?',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Restart', 
              onPress: () => Updates.reloadAsync() 
            },
          ]
        );
      }
    } catch (error) {
      console.error('Update check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }

  return { isChecking, checkForUpdates };
}
```

---

## Deployment Checklist

### Pre-Release Checklist

- [ ] All tests passing
- [ ] No console warnings/errors
- [ ] Performance tested on low-end devices
- [ ] Offline mode verified
- [ ] Deep links working
- [ ] Push notifications tested
- [ ] Analytics events verified
- [ ] Crash reporting configured
- [ ] App icons and splash screens set
- [ ] Version and build numbers updated

### Android Specific

- [ ] AAB builds successfully
- [ ] Signed with correct keystore
- [ ] ProGuard/R8 rules configured
- [ ] 64-bit support included
- [ ] Target SDK version set (34+)
- [ ] Permissions minimized

### iOS Specific

- [ ] IPA builds successfully
- [ ] Provisioning profiles valid
- [ ] Capabilities configured
- [ ] Privacy descriptions set
- [ ] App Transport Security configured
- [ ] No private API usage

### Store Listing

- [ ] Screenshots for all device sizes
- [ ] App description complete
- [ ] Keywords optimized
- [ ] Privacy policy published
- [ ] Support URL active
- [ ] Marketing URL (optional)

---

## Rollback Procedures

### OTA Rollback
```bash
# List published updates
eas update:list --branch production

# Rollback to previous update
eas update:republish --group <previous-update-group-id>
```

### Binary Rollback
1. Keep previous build artifacts
2. In Play Console: Release > Manage > Halt rollout
3. In App Store: Remove from sale (if critical)
4. Submit previous version as new release

---

## Monitoring & Analytics

### Crash Reporting (Sentry)

```typescript
// src/services/monitoring.ts
import * as Sentry from '@sentry/react-native';
import { config } from '@/config';

export function initializeMonitoring() {
  if (config.sentryDsn) {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.env,
      release: `bizflow@${config.version}+${config.buildNumber}`,
      tracesSampleRate: config.isProduction ? 0.2 : 1.0,
    });
  }
}
```

### Performance Monitoring

```bash
# View build performance
eas build:list

# View update analytics
eas update:list --branch production
```

---

## Summary

| Stage | Android | iOS |
|-------|---------|-----|
| Build | `eas build --platform android` | `eas build --platform ios` |
| Submit | `eas submit --platform android` | `eas submit --platform ios` |
| OTA Update | `eas update --branch production` | Same |
| Review Time | ~2-7 days | ~1-3 days |

**Release Cadence Recommendation:**
- Weekly: OTA updates (bug fixes, minor features)
- Monthly: Store releases (major features, native changes)
- As needed: Hotfixes via OTA
