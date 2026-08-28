import 'package:flutter/material.dart';

/// Shared Geographic Coordinate Representation
class GeoPoint {
  final double latitude;
  final double longitude;

  const GeoPoint({required this.latitude, required this.longitude});

  bool get isValid =>
      latitude >= -90.0 &&
      latitude <= 90.0 &&
      longitude >= -180.0 &&
      longitude <= 180.0 &&
      (latitude != 0.0 || longitude != 0.0);

  @override
  String toString() => 'GeoPoint(lat: $latitude, lng: $longitude)';
}

/// Approved Work Location Details
class ApprovedWorkLocation {
  final String? id;
  final String name;
  final String? code;
  final String? locationType;
  final String? address;
  final double latitude;
  final double longitude;
  final double allowedRadiusMeters;
  final double accuracyRequirementMeters;
  final bool isPrimary;

  const ApprovedWorkLocation({
    this.id,
    required this.name,
    this.code,
    this.locationType,
    this.address,
    required this.latitude,
    required this.longitude,
    required this.allowedRadiusMeters,
    this.accuracyRequirementMeters = 50.0,
    this.isPrimary = true,
  });

  GeoPoint get point => GeoPoint(latitude: latitude, longitude: longitude);

  bool get hasValidCoordinates =>
      latitude != 0.0 &&
      longitude != 0.0 &&
      latitude >= -90.0 &&
      latitude <= 90.0 &&
      longitude >= -180.0 &&
      longitude <= 180.0;

  factory ApprovedWorkLocation.fromJson(Map<String, dynamic> json) {
    return ApprovedWorkLocation(
      id: json['id']?.toString() ?? json['location_id']?.toString(),
      name: json['name']?.toString() ?? json['location_name']?.toString() ?? 'Assigned Work Location',
      code: json['code']?.toString() ?? json['location_code']?.toString(),
      locationType: json['location_type']?.toString() ?? 'OFFICE',
      address: json['address']?.toString(),
      latitude: ((json['latitude'] ?? 0.0) as num).toDouble(),
      longitude: ((json['longitude'] ?? 0.0) as num).toDouble(),
      allowedRadiusMeters: ((json['geofence_radius_meters'] ?? json['allowed_radius_meters'] ?? 150.0) as num).toDouble(),
      accuracyRequirementMeters: ((json['accuracy_requirement_meters'] ?? 50.0) as num).toDouble(),
      isPrimary: json['is_primary'] == true,
    );
  }
}

class EmergencyContactModel {
  final String name;
  final String relationship;
  final String phone;

  const EmergencyContactModel({
    required this.name,
    required this.relationship,
    required this.phone,
  });
}

class PayrollStatutoryModel {
  final String? bankName;
  final String? branchName;
  final String? accountNumber;
  final String? rawAccountNumber;
  final String? ifscCode;
  final String? accountHolderName;
  final String? panNumber;
  final String? rawPanNumber;
  final String? uanNumber;
  final String? rawUanNumber;
  final String? pfNumber;
  final String? rawPfNumber;
  final String? esiNumber;
  final String? rawEsiNumber;
  final String? taxRegime;

  const PayrollStatutoryModel({
    this.bankName,
    this.branchName,
    this.accountNumber,
    this.rawAccountNumber,
    this.ifscCode,
    this.accountHolderName,
    this.panNumber,
    this.rawPanNumber,
    this.uanNumber,
    this.rawUanNumber,
    this.pfNumber,
    this.rawPfNumber,
    this.esiNumber,
    this.rawEsiNumber,
    this.taxRegime,
  });
}

class CompanyAssetModel {
  final String id;
  final String assetName;
  final String assetId;
  final String category; // IT Hardware, Peripheral, Mobile, Access Card
  final String assignedDate;
  final String status; // Active, Returned, Under Repair, Pending Return
  final IconData icon;

  const CompanyAssetModel({
    required this.id,
    required this.assetName,
    required this.assetId,
    required this.category,
    required this.assignedDate,
    required this.status,
    this.icon = Icons.laptop_mac,
  });
}

class UserModel {
  final String name;
  final String firstName;
  final String employeeId;

  /// Real primary key of the employees row (employees.id).
  /// All FK columns (attendance_daily.employee_id, leave_entitlements.employee_id,
  /// leave_requests.employee_id …) reference this — NOT the employee_code.
  final String? employeeUuid;

  /// Real primary key of the legal-entity company row (companies.id).
  /// Used when inserting rows whose company_id FK must point at a company,
  /// e.g. leave_requests.company_id. Falls back to [companyId] (org id).
  final String? companyUuid;
  final String designation;
  final String department;
  final String role;
  final String machinePin;
  final String campus;
  final ApprovedWorkLocation approvedLocation;
  final String shiftStart;
  final String shiftEnd;
  final String? shiftName; // e.g. "General Shift (09:00 AM - 06:00 PM)"
  final double leaveBalanceDays;
  final String? reportsToId;
  final String? reportsToName;
  final String companyId;
  final String? companyName;

  final String employmentType;
  final String? status; // active | inactive | on_leave
  final String? joiningDate; // ISO date string e.g. "2026-07-17"
  final String personalEmail;
  final String? officeEmail;
  final String contactNumber;
  final String address;
  final EmergencyContactModel? emergencyContact;
  final PayrollStatutoryModel? payrollStatutory;
  final String? profileImage;
  final List<CompanyAssetModel> assignedAssets;

  const UserModel({
    required this.name,
    required this.firstName,
    required this.employeeId,
    this.employeeUuid,
    this.companyUuid,
    required this.designation,
    required this.department,
    required this.role,
    required this.machinePin,
    required this.campus,
    required this.approvedLocation,
    required this.shiftStart,
    required this.shiftEnd,
    this.shiftName,
    required this.leaveBalanceDays,
    this.reportsToId,
    this.reportsToName,
    this.companyId = "",
    this.companyName,
    this.employmentType = "Full Time",
    this.status,
    this.joiningDate,
    this.personalEmail = "",
    this.officeEmail,
    this.contactNumber = "",
    this.address = "",
    this.emergencyContact,
    this.payrollStatutory,
    this.profileImage,
    this.assignedAssets = const [],
  });

  /// Id to use for DB queries — prefers the employees.id PK, falls back to code.
  String get dataId =>
      (employeeUuid?.isNotEmpty == true) ? employeeUuid! : employeeId;

  bool get canAccessTeam => role == "TEAM_LEAD" || role == "MANAGER";
  bool get canApproveRequests => role == "TEAM_LEAD" || role == "MANAGER";
  bool get canViewTeamAttendance => role == "TEAM_LEAD" || role == "MANAGER";
  bool get canManageTeam => role == "MANAGER";
  bool get canViewPersonalWorkspace => true;
  String get shift => shiftName ?? (shiftStart.isNotEmpty ? '$shiftStart - $shiftEnd' : 'General Shift');
}

class PoshCommitteeConfigModel {
  final String id;
  final String companyId;
  final String committeeName;
  final bool isActive;
  final List<String> memberIds;

  const PoshCommitteeConfigModel({
    required this.id,
    required this.companyId,
    required this.committeeName,
    required this.isActive,
    required this.memberIds,
  });
}

class CompanyOrganizationModel {
  final String companyId;
  final String companyName;
  final String companyAdminId;
  final String companyAdminName;
  final PoshCommitteeConfigModel? poshCommittee;

  const CompanyOrganizationModel({
    required this.companyId,
    required this.companyName,
    required this.companyAdminId,
    required this.companyAdminName,
    this.poshCommittee,
  });
}

class AppletTileModel {
  final String id;
  final String label;
  final IconData icon;
  final Color bg;
  final Color fg;

  const AppletTileModel({
    required this.id,
    required this.label,
    required this.icon,
    required this.bg,
    required this.fg,
  });
}

class PassCardModel {
  final String id;
  final String label;
  final String title;
  final String subtitle;

  const PassCardModel({
    required this.id,
    required this.label,
    required this.title,
    required this.subtitle,
  });
}

enum ApprovalType { leave, regularization, expense }

class ApprovalRequestModel {
  final String id;
  final ApprovalType type;
  final String employee;
  final String initials;
  final String department;
  final String appliedAgo;
  final String title;
  final String detail;
  final String reason;
  final String? impact;

  const ApprovalRequestModel({
    required this.id,
    required this.type,
    required this.employee,
    required this.initials,
    required this.department,
    required this.appliedAgo,
    required this.title,
    required this.detail,
    required this.reason,
    this.impact,
  });
}

class CompletedApprovalModel {
  final String id;
  final String employee;
  final String initials;
  final String title;
  final String status;
  final String when;

  const CompletedApprovalModel({
    required this.id,
    required this.employee,
    required this.initials,
    required this.title,
    required this.status,
    required this.when,
  });
}

class PunchLogModel {
  final String label;
  final String time;
  final String place;

  const PunchLogModel({
    required this.label,
    required this.time,
    required this.place,
  });
}

class TeamMemberModel {
  final String name;
  final String role;
  final String initials;
  final String status; // 'In office' | 'On leave' | 'Remote'

  const TeamMemberModel({
    required this.name,
    required this.role,
    required this.initials,
    required this.status,
  });
}

enum AttendanceStatus { notCheckedIn, checkedIn, checkedOut }

class AttendanceSession {
  final AttendanceStatus status;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final int? netWorkingMinutes;
  final String? checkInLocationName;
  final double? checkInDistanceMeters;

  const AttendanceSession({
    required this.status,
    this.checkInTime,
    this.checkOutTime,
    this.netWorkingMinutes,
    this.checkInLocationName,
    this.checkInDistanceMeters,
  });

  bool get isCheckedIn => status == AttendanceStatus.checkedIn;
  bool get isCheckedOut => status == AttendanceStatus.checkedOut;
}

