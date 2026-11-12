import 'package:flutter/material.dart';
import '../models/sensor_data.dart';
import '../models/gas_sensor.dart';
import '../config/sensor_config.dart';

class SensorProvider with ChangeNotifier {
  SensorData? _latestData;
  final List<GasSensor> _gasSensors = [];

  SensorData? get latestData => _latestData;
  List<GasSensor> get gasSensors => _gasSensors;

  // Relative Air Quality Index (0 to 100, where 100 is excellent, 0 is hazardous)
  int get relativeAirQualityIndex {
    if (_latestData == null) return 100;
    
    // Very simplified generic calculation based on the fact that these are raw readings
    // In a real application, you'd calibrate these and convert ppm/ppb to a standard AQI
    int worstScore = 100;
    
    for (var sensor in _gasSensors) {
      if (sensor.value <= 0) continue;
      
      double ratio = sensor.value / sensor.config.highThreshold;
      int score = 100 - (ratio * 100).toInt();
      
      if (score < 0) score = 0;
      if (score < worstScore) worstScore = score;
    }
    
    return worstScore;
  }

  String get airQualityStatus {
    int aqi = relativeAirQualityIndex;
    if (aqi >= 80) return "GOOD";
    if (aqi >= 50) return "MODERATE";
    if (aqi >= 20) return "POOR";
    return "VERY POOR";
  }

  void updateData(SensorData data) {
    _latestData = data;
    _gasSensors.clear();
    
    // Map raw data back to configured sensors
    for (var config in SensorConfig.defaultSensors) {
      double value = data.gases[config.key] ?? -1.0;
      _gasSensors.add(GasSensor(config: config, value: value));
    }
    
    notifyListeners();
  }

  void resetToZero() {
    _latestData = SensorData(
      deviceId: 'DISCONNECTED',
      timestamp: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      mode: 'UNKNOWN',
      gases: {},
      temperature: 0.0,
      humidity: 0.0,
      pressure: 0.0,
      altitude: 0.0,
    );
    _gasSensors.clear();
    for (var config in SensorConfig.defaultSensors) {
      _gasSensors.add(GasSensor(config: config, value: 0.0));
    }
    notifyListeners();
  }
}
