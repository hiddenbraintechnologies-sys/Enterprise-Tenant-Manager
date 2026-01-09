import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../domain/entities/subscription.dart';
import '../../data/repositories/dashboard_repository.dart';

part 'dashboard_event.dart';
part 'dashboard_state.dart';

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final DashboardRepository _repository;

  DashboardBloc({required DashboardRepository repository})
      : _repository = repository,
        super(const DashboardState()) {
    on<DashboardDataRequested>(_onDataRequested);
    on<DashboardModuleSelected>(_onModuleSelected);
    on<DashboardModuleAccessChecked>(_onModuleAccessChecked);
    on<DashboardRefreshed>(_onRefreshed);
  }

  Future<void> _onDataRequested(
    DashboardDataRequested event,
    Emitter<DashboardState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, error: null));

    try {
      final data = await _repository.getDashboardData(
        tenantId: event.tenantId,
        accessToken: event.accessToken,
      );

      emit(state.copyWith(
        isLoading: false,
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        subscriptionTier: _parseTier(data.subscriptionTier),
        enabledModules: data.enabledModules,
        addonModules: data.addonModules,
        navigationItems: data.navigationItems,
      ));
    } on DashboardException catch (e) {
      emit(state.copyWith(
        isLoading: false,
        error: e.message,
        errorCode: e.code,
      ));
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        error: 'Failed to load dashboard',
      ));
    }
  }

  SubscriptionTier _parseTier(String? tier) {
    if (tier == null) return SubscriptionTier.free;
    return SubscriptionTier.values.firstWhere(
      (e) => e.name == tier,
      orElse: () => SubscriptionTier.free,
    );
  }

  void _onModuleSelected(
    DashboardModuleSelected event,
    Emitter<DashboardState> emit,
  ) {
    emit(state.copyWith(selectedModuleId: event.moduleId));
  }

  Future<void> _onModuleAccessChecked(
    DashboardModuleAccessChecked event,
    Emitter<DashboardState> emit,
  ) async {
    try {
      final result = await _repository.checkModuleAccess(
        tenantId: event.tenantId,
        moduleId: event.moduleId,
        accessToken: event.accessToken,
      );

      if (!result.allowed) {
        emit(state.copyWith(
          moduleAccessError: result.upgradeMessage ?? result.reason,
        ));
      }
    } catch (e) {
      // Silently fail module access check
    }
  }

  Future<void> _onRefreshed(
    DashboardRefreshed event,
    Emitter<DashboardState> emit,
  ) async {
    add(DashboardDataRequested(
      tenantId: event.tenantId,
      accessToken: event.accessToken,
    ));
  }
}

class DashboardModule extends Equatable {
  final String id;
  final String name;
  final String description;
  final String icon;
  final String route;
  final bool isEnabled;

  const DashboardModule({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.route,
    this.isEnabled = true,
  });

  @override
  List<Object?> get props => [id, name, route];

  factory DashboardModule.fromJson(Map<String, dynamic> json) {
    return DashboardModule(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      icon: json['icon'] as String? ?? 'apps',
      route: json['route'] as String? ?? '/',
      isEnabled: json['isEnabled'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'icon': icon,
        'route': route,
        'isEnabled': isEnabled,
      };
}

class NavigationItem extends Equatable {
  final String id;
  final String label;
  final String icon;
  final String route;

  const NavigationItem({
    required this.id,
    required this.label,
    required this.icon,
    required this.route,
  });

  @override
  List<Object?> get props => [id, label, route];

  factory NavigationItem.fromJson(Map<String, dynamic> json) {
    return NavigationItem(
      id: json['id'] as String,
      label: json['label'] as String? ?? '',
      icon: json['icon'] as String? ?? 'circle',
      route: json['route'] as String? ?? '/',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'icon': icon,
        'route': route,
      };
}
