import 'package:get_it/get_it.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/environment.dart';
import '../network/api_client.dart';
import '../network/auth_interceptor.dart';
import '../network/tenant_interceptor.dart';
import '../storage/secure_storage.dart';
import '../storage/token_storage.dart';
import '../storage/tenant_storage.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/datasources/tenant_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/tenant_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/tenant_repository.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/refresh_token_usecase.dart';
import '../../domain/usecases/get_tenants_usecase.dart';
import '../../domain/usecases/select_tenant_usecase.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/tenant/presentation/bloc/tenant_bloc.dart';

final getIt = GetIt.instance;

Future<void> configureDependencies() async {
  _registerStorage();
  _registerNetwork();
  _registerDataSources();
  _registerRepositories();
  _registerUseCases();
  _registerBlocs();
}

void _registerStorage() {
  getIt.registerLazySingleton<FlutterSecureStorage>(
    () => const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
    ),
  );
  
  getIt.registerLazySingleton<SecureStorage>(
    () => SecureStorageImpl(getIt<FlutterSecureStorage>()),
  );
  
  getIt.registerLazySingleton<TokenStorage>(
    () => TokenStorageImpl(getIt<SecureStorage>()),
  );
  
  getIt.registerLazySingleton<TenantStorage>(
    () => TenantStorageImpl(getIt<SecureStorage>()),
  );
}

void _registerNetwork() {
  getIt.registerLazySingleton<AuthInterceptor>(
    () => AuthInterceptor(getIt<TokenStorage>()),
  );
  
  getIt.registerLazySingleton<TenantInterceptor>(
    () => TenantInterceptor(getIt<TenantStorage>()),
  );
  
  getIt.registerLazySingleton<ApiClient>(
    () => ApiClient(
      baseUrl: Environment.config.baseUrl,
      authInterceptor: getIt<AuthInterceptor>(),
      tenantInterceptor: getIt<TenantInterceptor>(),
      connectTimeout: Environment.config.connectTimeout,
      receiveTimeout: Environment.config.receiveTimeout,
      enableLogging: Environment.config.enableLogging,
    ),
  );
}

void _registerDataSources() {
  getIt.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(getIt<ApiClient>()),
  );
  
  getIt.registerLazySingleton<TenantRemoteDataSource>(
    () => TenantRemoteDataSourceImpl(getIt<ApiClient>()),
  );
}

void _registerRepositories() {
  getIt.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: getIt<AuthRemoteDataSource>(),
      tokenStorage: getIt<TokenStorage>(),
    ),
  );
  
  getIt.registerLazySingleton<TenantRepository>(
    () => TenantRepositoryImpl(
      remoteDataSource: getIt<TenantRemoteDataSource>(),
      tenantStorage: getIt<TenantStorage>(),
    ),
  );
}

void _registerUseCases() {
  getIt.registerLazySingleton(() => LoginUseCase(getIt<AuthRepository>()));
  getIt.registerLazySingleton(() => LogoutUseCase(getIt<AuthRepository>()));
  getIt.registerLazySingleton(() => RefreshTokenUseCase(getIt<AuthRepository>()));
  getIt.registerLazySingleton(() => GetTenantsUseCase(getIt<TenantRepository>()));
  getIt.registerLazySingleton(() => SelectTenantUseCase(getIt<TenantRepository>()));
}

void _registerBlocs() {
  getIt.registerFactory<AuthBloc>(
    () => AuthBloc(
      loginUseCase: getIt<LoginUseCase>(),
      logoutUseCase: getIt<LogoutUseCase>(),
      refreshTokenUseCase: getIt<RefreshTokenUseCase>(),
      tokenStorage: getIt<TokenStorage>(),
    ),
  );
  
  getIt.registerFactory<TenantBloc>(
    () => TenantBloc(
      getTenantsUseCase: getIt<GetTenantsUseCase>(),
      selectTenantUseCase: getIt<SelectTenantUseCase>(),
      tenantStorage: getIt<TenantStorage>(),
    ),
  );
}
