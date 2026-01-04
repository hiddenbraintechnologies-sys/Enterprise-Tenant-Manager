import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? avatar;
  final String role;
  final List<String> tenantIds;
  final String? defaultTenantId;
  final bool isActive;
  final DateTime? createdAt;

  const User({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    this.avatar,
    required this.role,
    this.tenantIds = const [],
    this.defaultTenantId,
    this.isActive = true,
    this.createdAt,
  });

  String get fullName {
    if (firstName == null && lastName == null) return email;
    return '${firstName ?? ''} ${lastName ?? ''}'.trim();
  }

  String get initials {
    if (firstName != null && lastName != null) {
      return '${firstName![0]}${lastName![0]}'.toUpperCase();
    }
    if (firstName != null) return firstName![0].toUpperCase();
    return email[0].toUpperCase();
  }

  User copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? avatar,
    String? role,
    List<String>? tenantIds,
    String? defaultTenantId,
    bool? isActive,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      avatar: avatar ?? this.avatar,
      role: role ?? this.role,
      tenantIds: tenantIds ?? this.tenantIds,
      defaultTenantId: defaultTenantId ?? this.defaultTenantId,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [id, email, firstName, lastName, avatar, role, tenantIds, defaultTenantId, isActive];
}
