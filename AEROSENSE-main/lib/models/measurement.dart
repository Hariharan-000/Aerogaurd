import 'sensor_data.dart';

class Measurement {
  final int id;
  final SensorData data;
  final double? latitude;
  final double? longitude;

  Measurement({
    this.id = 0,
    required this.data,
    this.latitude,
    this.longitude,
  });

  factory Measurement.fromJson(Map<String, dynamic> json) {
    return Measurement(
      id: json['id'] as int? ?? 0,
      data: SensorData.fromJson(json),
      latitude: json['latitude'] as double?,
      longitude: json['longitude'] as double?,
    );
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> json = data.toJson();
    json['id'] = id;
    if (latitude != null) json['latitude'] = latitude;
    if (longitude != null) json['longitude'] = longitude;
    return json;
  }
}
