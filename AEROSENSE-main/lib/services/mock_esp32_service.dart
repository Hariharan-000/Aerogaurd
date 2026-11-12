import 'dart:async';
import 'dart:math';
import '../models/sensor_data.dart';

class MockESP32Service {
  Timer? _timer;
  final StreamController<SensorData> _dataController = StreamController<SensorData>.broadcast();
  bool _isConnected = false;
  String _mode = 'DRONE';

  Stream<SensorData> get dataStream => _dataController.stream;
  bool get isConnected => _isConnected;

  void connect() {
    _isConnected = true;
    _timer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (!_isConnected) {
        timer.cancel();
        return;
      }
      _dataController.add(_generateMockData());
    });
  }

  void disconnect() {
    _isConnected = false;
    _timer?.cancel();
    _timer = null;
  }

  void setMode(String mode) {
    _mode = mode;
  }

  int _sequenceIndex = 0;

  SensorData _generateMockData() {
    // 8-step sequence of air quality events, now with GPS coordinates moving across a path in India
    final sequence = [
      // 1. Normal baseline (Mumbai)
      { 'gas1': 45.0, 'gas2': 15.0, 'gas3': 30.0, 'gas4': 400.0, 'gas5': 5.0, 'gas6': 2.0, 'gas7': 0.5, 'temp': 28.5, 'hum': 65.0, 'lat': 19.0760, 'lng': 72.8777 },
      // 2. Slight elevation (Moving North-East)
      { 'gas1': 65.0, 'gas2': 25.0, 'gas3': 45.0, 'gas4': 410.0, 'gas5': 10.0, 'gas6': 5.0, 'gas7': 1.0, 'temp': 29.0, 'hum': 63.0, 'lat': 19.1000, 'lng': 72.9000 },
      // 3. Spiking up
      { 'gas1': 110.0, 'gas2': 50.0, 'gas3': 80.0, 'gas4': 430.0, 'gas5': 20.0, 'gas6': 15.0, 'gas7': 3.0, 'temp': 29.5, 'hum': 60.0, 'lat': 19.1200, 'lng': 72.9200 },
      // 4. Critical pollution event
      { 'gas1': 210.0, 'gas2': 85.0, 'gas3': 150.0, 'gas4': 480.0, 'gas5': 45.0, 'gas6': 30.0, 'gas7': 8.0, 'temp': 30.5, 'hum': 55.0, 'lat': 19.1500, 'lng': 72.9500 },
      // 5. Holding critical
      { 'gas1': 215.0, 'gas2': 88.0, 'gas3': 155.0, 'gas4': 485.0, 'gas5': 48.0, 'gas6': 32.0, 'gas7': 8.5, 'temp': 30.8, 'hum': 54.0, 'lat': 19.1700, 'lng': 72.9700 },
      // 6. Starting to clear
      { 'gas1': 150.0, 'gas2': 60.0, 'gas3': 100.0, 'gas4': 450.0, 'gas5': 30.0, 'gas6': 20.0, 'gas7': 5.0, 'temp': 30.0, 'hum': 58.0, 'lat': 19.1900, 'lng': 72.9900 },
      // 7. Mostly clear
      { 'gas1': 75.0, 'gas2': 30.0, 'gas3': 50.0, 'gas4': 420.0, 'gas5': 15.0, 'gas6': 10.0, 'gas7': 2.0, 'temp': 29.2, 'hum': 62.0, 'lat': 19.2100, 'lng': 73.0100 },
      // 8. Back to baseline
      { 'gas1': 48.0, 'gas2': 18.0, 'gas3': 32.0, 'gas4': 405.0, 'gas5': 6.0, 'gas6': 3.0, 'gas7': 0.8, 'temp': 28.8, 'hum': 64.0, 'lat': 19.2300, 'lng': 73.0300 },
    ];

    final current = sequence[_sequenceIndex];
    _sequenceIndex = (_sequenceIndex + 1) % sequence.length;

    return SensorData(
      deviceId: 'AERO_001_MOCK',
      timestamp: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      mode: _mode,
      gases: {
        'gas1': current['gas1']!,
        'gas2': current['gas2']!,
        'gas3': current['gas3']!,
        'gas4': current['gas4']!,
        'gas5': current['gas5']!,
        'gas6': current['gas6']!,
        'gas7': current['gas7']!,
      },
      temperature: current['temp']!,
      humidity: current['hum']!,
      pressure: 1013.25,
      altitude: 120.5,
      latitude: current['lat']!,
      longitude: current['lng']!,
    );
  }

  void dispose() {
    _timer?.cancel();
    _dataController.close();
  }
}
