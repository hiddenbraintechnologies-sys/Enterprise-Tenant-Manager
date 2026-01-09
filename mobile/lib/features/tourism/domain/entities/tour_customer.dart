import 'package:equatable/equatable.dart';

class EmergencyContact extends Equatable {
  final String name;
  final String phone;
  final String? relationship;

  const EmergencyContact({
    required this.name,
    required this.phone,
    this.relationship,
  });

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    return EmergencyContact(
      name: json['name'] as String,
      phone: json['phone'] as String,
      relationship: json['relationship'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'phone': phone,
      'relationship': relationship,
    };
  }

  @override
  List<Object?> get props => [name, phone, relationship];
}

class TourCustomer extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String phone;
  final String email;
  final String? passportNumber;
  final String? address;
  final EmergencyContact? emergencyContact;
  final List<String> bookingHistory;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TourCustomer({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.phone,
    required this.email,
    this.passportNumber,
    this.address,
    this.emergencyContact,
    this.bookingHistory = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory TourCustomer.fromJson(Map<String, dynamic> json) {
    return TourCustomer(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String,
      passportNumber: json['passportNumber'] as String?,
      address: json['address'] as String?,
      emergencyContact: json['emergencyContact'] != null
          ? EmergencyContact.fromJson(
              json['emergencyContact'] as Map<String, dynamic>)
          : null,
      bookingHistory: json['bookingHistory'] != null
          ? List<String>.from(json['bookingHistory'])
          : [],
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'phone': phone,
      'email': email,
      'passportNumber': passportNumber,
      'address': address,
      'emergencyContact': emergencyContact?.toJson(),
      'bookingHistory': bookingHistory,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  TourCustomer copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? phone,
    String? email,
    String? passportNumber,
    String? address,
    EmergencyContact? emergencyContact,
    List<String>? bookingHistory,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return TourCustomer(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      passportNumber: passportNumber ?? this.passportNumber,
      address: address ?? this.address,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      bookingHistory: bookingHistory ?? this.bookingHistory,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  int get totalBookings => bookingHistory.length;

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        phone,
        email,
        passportNumber,
        address,
        emergencyContact,
        bookingHistory,
        createdAt,
        updatedAt,
      ];
}
