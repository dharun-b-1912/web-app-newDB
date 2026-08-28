import 'package:flutter/material.dart';
import '../../models/hrms_models.dart';
import 'employee_realtime_service.dart';

class UserService extends ChangeNotifier {
  static final UserService instance = UserService._internal();
  UserService._internal();

  bool _isLoggedIn = false;
  bool get isLoggedIn => _isLoggedIn;

  /// Neutral placeholder used while logged out — never exposes dummy data.
  static const UserModel _guestUser = UserModel(
    name: 'Guest',
    firstName: 'Guest',
    employeeId: '',
    designation: '',
    department: '',
    role: 'EMPLOYEE',
    machinePin: '',
    campus: '',
    approvedLocation: ApprovedWorkLocation(
      name: 'Office',
      latitude: 0,
      longitude: 0,
      allowedRadiusMeters: 100,
    ),
    shiftStart: '09:30 AM',
    shiftEnd: '06:30 PM',
    leaveBalanceDays: 0,
    employmentType: 'Full Time',
    personalEmail: '',
    contactNumber: '',
    address: '',
  );

  UserModel _currentUser = _guestUser;
  UserModel get currentUser => _currentUser;
  List<UserModel> get availableUsers => _isLoggedIn ? [_currentUser] : [];

  void setUser(UserModel newUser) {
    final previousId = _isLoggedIn ? _currentUser.dataId : null;
    _currentUser = newUser;
    _isLoggedIn = true;
    notifyListeners();

    // Automatically initialize/subscribe to real-time profile updates if switching or newly logged in
    if (newUser.dataId.isNotEmpty && previousId != newUser.dataId) {
      EmployeeRealtimeService.instance.subscribe(
        newUser.dataId,
        authEmail: newUser.officeEmail ?? newUser.personalEmail,
      );
    }
  }

  void clearUser() {
    _currentUser = _guestUser;
    _isLoggedIn = false;
    notifyListeners();

    // Cleanly remove real-time channel on logout
    EmployeeRealtimeService.instance.unsubscribe();
  }

  void switchUser(UserModel newUser) {
    setUser(newUser);
  }

  void updateProfileImage(String imagePath) {
    if (_currentUser.profileImage == imagePath) return; // Prevent flickering loop

    _currentUser = UserModel(
      name: _currentUser.name,
      firstName: _currentUser.firstName,
      employeeId: _currentUser.employeeId,
      employeeUuid: _currentUser.employeeUuid,
      companyUuid: _currentUser.companyUuid,
      designation: _currentUser.designation,
      department: _currentUser.department,
      role: _currentUser.role,
      machinePin: _currentUser.machinePin,
      campus: _currentUser.campus,
      approvedLocation: _currentUser.approvedLocation,
      shiftStart: _currentUser.shiftStart,
      shiftEnd: _currentUser.shiftEnd,
      leaveBalanceDays: _currentUser.leaveBalanceDays,
      reportsToId: _currentUser.reportsToId,
      reportsToName: _currentUser.reportsToName,
      companyId: _currentUser.companyId,
      companyName: _currentUser.companyName,
      employmentType: _currentUser.employmentType,
      personalEmail: _currentUser.personalEmail,
      officeEmail: _currentUser.officeEmail,
      contactNumber: _currentUser.contactNumber,
      address: _currentUser.address,
      emergencyContact: _currentUser.emergencyContact,
      payrollStatutory: _currentUser.payrollStatutory,
      profileImage: imagePath,
      assignedAssets: _currentUser.assignedAssets,
    );
    notifyListeners();
  }

  void updateEmergencyContact(EmergencyContactModel newContact) {
    _currentUser = UserModel(
      name: _currentUser.name,
      firstName: _currentUser.firstName,
      employeeId: _currentUser.employeeId,
      employeeUuid: _currentUser.employeeUuid,
      companyUuid: _currentUser.companyUuid,
      designation: _currentUser.designation,
      department: _currentUser.department,
      role: _currentUser.role,
      machinePin: _currentUser.machinePin,
      campus: _currentUser.campus,
      approvedLocation: _currentUser.approvedLocation,
      shiftStart: _currentUser.shiftStart,
      shiftEnd: _currentUser.shiftEnd,
      leaveBalanceDays: _currentUser.leaveBalanceDays,
      reportsToId: _currentUser.reportsToId,
      reportsToName: _currentUser.reportsToName,
      companyId: _currentUser.companyId,
      companyName: _currentUser.companyName,
      employmentType: _currentUser.employmentType,
      personalEmail: _currentUser.personalEmail,
      officeEmail: _currentUser.officeEmail,
      contactNumber: _currentUser.contactNumber,
      address: _currentUser.address,
      emergencyContact: newContact,
      payrollStatutory: _currentUser.payrollStatutory,
      profileImage: _currentUser.profileImage,
      assignedAssets: _currentUser.assignedAssets,
    );
    notifyListeners();
  }
}
