import 'package:flutter/material.dart';
import '../models/device.dart';

class DeviceProvider with ChangeNotifier {
  Device _device = Device(id: 'DISCONNECTED', name: 'No Device');

  Device get device => _device;
  ConnectionStatus get status => _device.status;

  void updateDevice(Device newDevice) {
    _device = newDevice;
    notifyListeners();
  }

  void setStatus(ConnectionStatus status) {
    if (_device.status != status) {
      _device = _device.copyWith(status: status, lastSeen: DateTime.now());
      notifyListeners();
    }
  }

  void updateLastSeen() {
    _device = _device.copyWith(lastSeen: DateTime.now());
    notifyListeners();
  }
}
