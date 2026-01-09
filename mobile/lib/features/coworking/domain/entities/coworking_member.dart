import 'package:equatable/equatable.dart';

class CoworkingMember extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String? company;
  final String? phone;
  final String email;
  final String membershipPlan;
  final int credits;
  final String? accessCard;
  final String? profileImage;
  final bool isActive;
  final DateTime? memberSince;
  final DateTime createdAt;
  final DateTime updatedAt;

  const CoworkingMember({
    required this.id,
    required this.tenantId,
    required this.name,
    this.company,
    this.phone,
    required this.email,
    required this.membershipPlan,
    required this.credits,
    this.accessCard,
    this.profileImage,
    required this.isActive,
    this.memberSince,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CoworkingMember.fromJson(Map<String, dynamic> json) {
    return CoworkingMember(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      company: json['company'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String,
      membershipPlan: json['membershipPlan'] as String? ?? 'basic',
      credits: json['credits'] as int? ?? 0,
      accessCard: json['accessCard'] as String?,
      profileImage: json['profileImage'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      memberSince: json['memberSince'] != null
          ? DateTime.parse(json['memberSince'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'company': company,
      'phone': phone,
      'email': email,
      'membershipPlan': membershipPlan,
      'credits': credits,
      'accessCard': accessCard,
      'profileImage': profileImage,
      'isActive': isActive,
      'memberSince': memberSince?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  CoworkingMember copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? company,
    String? phone,
    String? email,
    String? membershipPlan,
    int? credits,
    String? accessCard,
    String? profileImage,
    bool? isActive,
    DateTime? memberSince,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CoworkingMember(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      company: company ?? this.company,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      membershipPlan: membershipPlan ?? this.membershipPlan,
      credits: credits ?? this.credits,
      accessCard: accessCard ?? this.accessCard,
      profileImage: profileImage ?? this.profileImage,
      isActive: isActive ?? this.isActive,
      memberSince: memberSince ?? this.memberSince,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        company,
        phone,
        email,
        membershipPlan,
        credits,
        accessCard,
        profileImage,
        isActive,
        memberSince,
        createdAt,
        updatedAt,
      ];
}
