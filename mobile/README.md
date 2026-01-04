# BizFlow Mobile App

Flutter mobile application for the BizFlow SaaS platform, supporting Android and iOS.

## Architecture

This app follows **Clean Architecture** principles with three distinct layers:

```
mobile/lib/
├── app/                    # App configuration
│   ├── app.dart           # Main app widget with BlocProviders
│   └── app_theme.dart     # Theme configuration
│
├── core/                   # Core infrastructure
│   ├── config/
│   │   └── environment.dart     # Environment switching (dev/prod)
│   ├── di/
│   │   └── injection.dart       # Dependency injection setup
│   ├── network/
│   │   ├── api_client.dart      # Dio HTTP client
│   │   ├── api_exceptions.dart  # Custom exceptions
│   │   ├── auth_interceptor.dart    # JWT token handling
│   │   └── tenant_interceptor.dart  # Multi-tenant headers
│   ├── navigation/
│   │   ├── navigation_item.dart     # Navigation item model
│   │   └── business_navigation_config.dart  # Business-specific nav
│   ├── permissions/
│   │   └── role_permissions.dart    # Role-based permission matrix
│   ├── offline/
│   │   ├── database_helper.dart     # Hive cache management
│   │   ├── connectivity_service.dart # Connection monitoring
│   │   ├── sync_service.dart        # Background sync
│   │   └── offline_repository_mixin.dart # Offline support mixin
│   └── storage/
│       ├── secure_storage.dart  # Encrypted storage
│       ├── token_storage.dart   # JWT token persistence
│       └── tenant_storage.dart  # Tenant context persistence
│
├── data/                   # Data Layer
│   ├── datasources/       # Remote API data sources
│   ├── models/            # JSON serializable models
│   └── repositories/      # Repository implementations
│
├── domain/                 # Domain Layer
│   ├── entities/          # Business entities
│   ├── repositories/      # Repository interfaces
│   └── usecases/          # Business logic use cases
│
├── features/              # Feature modules
│   ├── auth/              # Authentication feature
│   ├── tenant/            # Multi-tenant selection
│   ├── dashboard/         # Main dashboard
│   └── compliance/        # Compliance features
│
└── presentation/          # Shared presentation
    ├── routes/            # GoRouter configuration
    ├── pages/             # Shared pages
    └── widgets/           # Reusable widgets
```

## Key Features

### 1. Environment Switching
```dart
// Switch between development and production
await Environment.initialize(EnvironmentType.development);
// or
await Environment.initialize(EnvironmentType.production);
```

### 2. JWT Authentication with Auto-Refresh
- Automatic token refresh on 401 responses
- Secure token storage using `flutter_secure_storage`
- Token expiry detection and proactive refresh
- Request queue during token refresh

### 3. Multi-Tenant Support
- Tenant selection after login
- Automatic `X-Tenant-ID` header injection
- Tenant context persistence across sessions
- Tenant switching capability

### 4. State Management with BLoC
- `AuthBloc` - Authentication state
- `TenantBloc` - Tenant selection state
- Feature-specific BLoCs for domain logic

### 5. Role-Based Navigation
- Dashboard adapts based on BusinessType (PG/Hostel, Salon, Gym, Clinic, etc.)
- Role permissions (Super Admin, Admin, Manager, Staff, Customer) control visible features
- Navigation items dynamically filtered by user permissions
- BusinessType is read-only from mobile (set by backend)

### 6. Offline Support
- **Local Cache**: Hive-based storage for offline data access
- **Read-Only Mode**: Users can view cached data when offline
- **Background Sync**: Automatic sync when connection restored
- **Conflict Resolution**: Configurable strategies (server-wins, client-wins, merge)
- **Sync Queue**: Pending changes queued and processed when online
- **Offline Indicator**: Visual feedback for connectivity status

### 7. Push Notifications (FCM)
- **Firebase Cloud Messaging**: Real-time push notifications
- **Tenant Routing**: Notifications routed to correct tenant context
- **Deep Links**: Tap notifications to navigate directly to modules
- **Topic Subscriptions**: Subscribe by tenant, role, or module
- **Local Notifications**: Foreground notification display
- **Preferences**: Per-type notification settings

## Getting Started

### Prerequisites
- Flutter SDK >= 3.0.0
- Dart >= 3.0.0
- Android Studio / Xcode

### Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
flutter pub get
```

3. Generate code (models, freezed, etc.):
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

4. Run the app:
```bash
# Development
flutter run --flavor dev

# Production
flutter run --flavor prod
```

## API Integration

The app consumes the existing BizFlow backend APIs:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Tenants
- `GET /api/tenants` - List user's tenants
- `GET /api/tenants/:id` - Get tenant details
- `GET /api/tenants/:id/settings` - Tenant settings
- `GET /api/tenants/:id/branding` - Tenant branding

### Compliance (Example)
- `GET /api/uk-compliance/vat-rates` - UK VAT rates
- `GET /api/india-compliance/gst/configuration` - GST config
- `GET /api/uae-compliance/vat/configuration` - UAE VAT config

## Testing

```bash
# Run unit tests
flutter test

# Run with coverage
flutter test --coverage

# Run integration tests
flutter test integration_test
```

## Building for Release

### Android
```bash
flutter build apk --release --flavor prod
flutter build appbundle --release --flavor prod
```

### iOS
```bash
flutter build ios --release --flavor prod
```

## Environment Configuration

| Environment | Base URL | Logging | Crashlytics |
|-------------|----------|---------|-------------|
| Development | dev.bizflow.app | Enabled | Disabled |
| Production | api.bizflow.app | Disabled | Enabled |

## Security

- All tokens stored in encrypted secure storage
- Automatic token cleanup on logout
- No sensitive data in logs (production)
- Certificate pinning ready (add in production)
