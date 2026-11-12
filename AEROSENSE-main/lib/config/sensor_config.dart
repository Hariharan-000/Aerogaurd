class SensorConfig {
  final String key;
  final String name;
  final String type;
  final String unit;
  final double warningThreshold;
  final double highThreshold;
  final double maxRange;

  const SensorConfig({
    required this.key,
    required this.name,
    required this.type,
    required this.unit,
    required this.warningThreshold,
    required this.highThreshold,
    required this.maxRange,
  });

  static const List<SensorConfig> defaultSensors = [
    SensorConfig(
      key: 'gas1',
      name: 'Smoke / LPG',
      type: 'MQ-2',
      unit: 'ppm',
      warningThreshold: 300,
      highThreshold: 800,
      maxRange: 1000,
    ),
    SensorConfig(
      key: 'gas2',
      name: 'Carbon Monoxide',
      type: 'MQ-7',
      unit: 'ppm',
      warningThreshold: 50,
      highThreshold: 150,
      maxRange: 500,
    ),
    SensorConfig(
      key: 'gas3',
      name: 'Air Quality',
      type: 'MQ-135',
      unit: 'ppm',
      warningThreshold: 400,
      highThreshold: 1000,
      maxRange: 2000,
    ),
    SensorConfig(
      key: 'gas4',
      name: 'Methane',
      type: 'MQ-4',
      unit: 'ppm',
      warningThreshold: 500,
      highThreshold: 1000,
      maxRange: 2000,
    ),
    SensorConfig(
      key: 'gas5',
      name: 'Hydrogen',
      type: 'MQ-8',
      unit: 'ppm',
      warningThreshold: 100,
      highThreshold: 500,
      maxRange: 1000,
    ),
    SensorConfig(
      key: 'gas6',
      name: 'Ozone',
      type: 'MQ-131',
      unit: 'ppb',
      warningThreshold: 50,
      highThreshold: 100,
      maxRange: 500,
    ),
    SensorConfig(
      key: 'gas7',
      name: 'Ammonia',
      type: 'MQ-137',
      unit: 'ppm',
      warningThreshold: 20,
      highThreshold: 50,
      maxRange: 200,
    ),
  ];
}
