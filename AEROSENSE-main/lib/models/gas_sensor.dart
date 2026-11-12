import '../config/sensor_config.dart';

enum SensorStatus { normal, warning, high, unknown }

class GasSensor {
  final SensorConfig config;
  final double value;

  GasSensor({
    required this.config,
    required this.value,
  });

  SensorStatus get status {
    if (value < 0) return SensorStatus.unknown;
    if (value >= config.highThreshold) return SensorStatus.high;
    if (value >= config.warningThreshold) return SensorStatus.warning;
    return SensorStatus.normal;
  }
}
