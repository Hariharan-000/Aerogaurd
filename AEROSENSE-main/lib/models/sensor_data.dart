class SensorData {
  final String deviceId;
  final int timestamp;
  final String mode;
  final Map<String, double> gases;
  final double temperature;
  final double humidity;
  final double pressure;
  final double altitude;
  final double latitude;
  final double longitude;

  SensorData({
    required this.deviceId,
    required this.timestamp,
    required this.mode,
    required this.gases,
    required this.temperature,
    required this.humidity,
    required this.pressure,
    required this.altitude,
    this.latitude = 0.0,
    this.longitude = 0.0,
  });

  factory SensorData.fromJson(Map<String, dynamic> json) {
    return SensorData(
      deviceId: json['device_id'] ?? 'UNKNOWN',
      timestamp: json['timestamp'] ?? DateTime.now().millisecondsSinceEpoch ~/ 1000,
      mode: json['mode'] ?? 'UNKNOWN',
      gases: {
        'gas1': (json['gas1'] ?? -1).toDouble(),
        'gas2': (json['gas2'] ?? -1).toDouble(),
        'gas3': (json['gas3'] ?? -1).toDouble(),
        'gas4': (json['gas4'] ?? -1).toDouble(),
        'gas5': (json['gas5'] ?? -1).toDouble(),
        'gas6': (json['gas6'] ?? -1).toDouble(),
        'gas7': (json['gas7'] ?? -1).toDouble(),
      },
      temperature: (json['temperature'] ?? -273.15).toDouble(),
      humidity: (json['humidity'] ?? -1).toDouble(),
      pressure: (json['pressure'] ?? -1).toDouble(),
      altitude: (json['altitude'] ?? -1).toDouble(),
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'device_id': deviceId,
      'timestamp': timestamp,
      'mode': mode,
      'gas1': gases['gas1'],
      'gas2': gases['gas2'],
      'gas3': gases['gas3'],
      'gas4': gases['gas4'],
      'gas5': gases['gas5'],
      'gas6': gases['gas6'],
      'gas7': gases['gas7'],
      'temperature': temperature,
      'humidity': humidity,
      'pressure': pressure,
      'altitude': altitude,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}
