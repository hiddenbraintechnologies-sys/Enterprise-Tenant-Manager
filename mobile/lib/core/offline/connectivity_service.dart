import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

enum ConnectionStatus { online, offline }

class ConnectivityService {
  static ConnectivityService? _instance;
  static ConnectivityService get instance => _instance ??= ConnectivityService._();

  ConnectivityService._();

  final Connectivity _connectivity = Connectivity();
  final _statusController = StreamController<ConnectionStatus>.broadcast();
  
  ConnectionStatus _currentStatus = ConnectionStatus.online;
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  ConnectionStatus get currentStatus => _currentStatus;
  bool get isOnline => _currentStatus == ConnectionStatus.online;
  bool get isOffline => _currentStatus == ConnectionStatus.offline;
  Stream<ConnectionStatus> get statusStream => _statusController.stream;

  Future<void> initialize() async {
    final results = await _connectivity.checkConnectivity();
    _updateStatus(results);
    
    _subscription = _connectivity.onConnectivityChanged.listen(_updateStatus);
  }

  void _updateStatus(List<ConnectivityResult> results) {
    final hasConnection = results.any((result) => 
      result != ConnectivityResult.none
    );

    final newStatus = hasConnection ? ConnectionStatus.online : ConnectionStatus.offline;
    
    if (newStatus != _currentStatus) {
      _currentStatus = newStatus;
      _statusController.add(newStatus);
      debugPrint('Connectivity changed: $_currentStatus');
    }
  }

  Future<bool> checkConnection() async {
    final results = await _connectivity.checkConnectivity();
    _updateStatus(results);
    return isOnline;
  }

  void dispose() {
    _subscription?.cancel();
    _statusController.close();
  }
}
