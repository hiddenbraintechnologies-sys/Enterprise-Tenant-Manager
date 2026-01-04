import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.email,
    super.firstName,
    super.lastName,
    super.avatar,
    required super.role,
    super.tenantIds,
    super.defaultTenantId,
    super.isActive,
    super.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      avatar: json['avatar'] as String?,
      role: json['role'] as String? ?? 'user',
      tenantIds: (json['tenantIds'] as List<dynamic>?)?.cast<String>() ?? [],
      defaultTenantId: json['defaultTenantId'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'avatar': avatar,
      'role': role,
      'tenantIds': tenantIds,
      'defaultTenantId': defaultTenantId,
      'isActive': isActive,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
