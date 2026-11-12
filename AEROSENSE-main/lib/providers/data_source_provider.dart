import 'dart:async';
import 'package:flutter/material.dart';
import '../services/mock_esp32_service.dart';
import '../services/ble_service.dart';
import '../models/sensor_data.dart';
import '../models/device.dart';
import '../providers/sensor_provider.dart';
import '../providers/measurement_provider.dart';
import '../providers/device_provider.dart';

class DataSourceProvider with ChangeNotifier {
  bool _isDemoMode = false;
  
  final MockESP32Service _mockService;
  final BleService _bleService;
  
  final SensorProvider _sensorProvider;
  final MeasurementProvider _measurementProvider;
  final DeviceProvider _deviceProvider;
  
  StreamSubscription<SensorData>? _mockSubscription;
  StreamSubscription<SensorData>? _bleSubscription;

  DataSourceProvider(
    this._mockService,
    this._bleService,
    this._sensorProvider,
    this._measurementProvider,
    this._deviceProvider,
  ) {
    _initDataStream();
    
    // Listen to device connection status
    _deviceProvider.addListener(_onDeviceStatusChanged);
  }

  bool get isDemoMode => _isDemoMode;

  void setDemoMode(bool value) {
    if (_isDemoMode != value) {
      _isDemoMode = value;
      _initDataStream();
      notifyListeners();
    }
  }

  void _onDeviceStatusChanged() {
    if (!_isDemoMode && _deviceProvider.status != ConnectionStatus.connected) {
      _sensorProvider.resetToZero();
    }
  }

  void _initDataStream() {
    _cancelSubscriptions();

    if (_isDemoMode) {
      _mockSubscription = _mockService.dataStream.listen((data) {
        _sensorProvider.updateData(data);
        _measurementProvider.addDataPoint(data);
      });
      _mockService.connect();
    } else {
      _mockService.disconnect();
      
      // If not connected, immediately reset to zero
      if (_deviceProvider.status != ConnectionStatus.connected) {
        _sensorProvider.resetToZero();
      }
      
      // Listen to real service
      _bleSubscription = _bleService.dataStream.listen((data) {
        _sensorProvider.updateData(data);
        _measurementProvider.addDataPoint(data);
      });
    }
  }

  void _cancelSubscriptions() {
    _mockSubscription?.cancel();
    _bleSubscription?.cancel();
  }
  
  @override
  void dispose() {
    _deviceProvider.removeListener(_onDeviceStatusChanged);
    _cancelSubscriptions();
    super.dispose();
  }
}
