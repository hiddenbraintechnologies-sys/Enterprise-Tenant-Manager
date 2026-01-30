enum EnvironmentType { development, production }

class Environment {
  static late EnvironmentType _currentEnvironment;
  static late EnvironmentConfig _config;

  static EnvironmentType get current => _currentEnvironment;
  static EnvironmentConfig get config => _config;

  static Future<void> initialize(EnvironmentType env) async {
    _currentEnvironment = env;
    _config = EnvironmentConfig.fromEnvironment(env);
  }

  static void switchEnvironment(EnvironmentType env) {
    _currentEnvironment = env;
    _config = EnvironmentConfig.fromEnvironment(env);
  }

  static bool get isDevelopment => _currentEnvironment == EnvironmentType.development;
  static bool get isProduction => _currentEnvironment == EnvironmentType.production;
}

class EnvironmentConfig {
  final String baseUrl;
  final String apiVersion;
  final Duration connectTimeout;
  final Duration receiveTimeout;
  final bool enableLogging;
  final bool enableCrashlytics;

  const EnvironmentConfig({
    required this.baseUrl,
    required this.apiVersion,
    required this.connectTimeout,
    required this.receiveTimeout,
    required this.enableLogging,
    required this.enableCrashlytics,
  });

  String get apiUrl => '$baseUrl/api/$apiVersion';

  factory EnvironmentConfig.fromEnvironment(EnvironmentType env) {
    switch (env) {
      case EnvironmentType.development:
        return const EnvironmentConfig(
          baseUrl: 'https://mybizstream.replit.app',
          apiVersion: 'v1',
          connectTimeout: Duration(seconds: 30),
          receiveTimeout: Duration(seconds: 30),
          enableLogging: true,
          enableCrashlytics: false,
        );
      case EnvironmentType.production:
        return const EnvironmentConfig(
          baseUrl: 'https://payodsoft.co.uk',
          apiVersion: 'v1',
          connectTimeout: Duration(seconds: 15),
          receiveTimeout: Duration(seconds: 15),
          enableLogging: false,
          enableCrashlytics: true,
        );
    }
  }
}
