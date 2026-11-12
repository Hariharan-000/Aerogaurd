import 'package:flutter/material.dart';
import '../models/measurement.dart';
import '../models/sensor_data.dart';

class MeasurementProvider with ChangeNotifier {
  final List<Measurement> _history = [];
  final List<SensorData> _sessionData = []; // For the real-time graph

  List<Measurement> get history => _history;
  List<SensorData> get sessionData => _sessionData;

  void addDataPoint(SensorData data) {
    _sessionData.add(data);
    
    // Keep only the last hour of data points (assuming 1 point every 2 seconds = 1800 points)
    if (_sessionData.length > 1800) {
      _sessionData.removeAt(0);
    }
    
    notifyListeners();
  }
  
  void saveMeasurement(Measurement measurement) {
    _history.add(measurement);
    // Here you would also interact with the storage_service to persist it locally
    notifyListeners();
  }

  void clearHistory() {
    _history.clear();
    notifyListeners();
  }
  
  void clearSession() {
    _sessionData.clear();
    notifyListeners();
  }
}
