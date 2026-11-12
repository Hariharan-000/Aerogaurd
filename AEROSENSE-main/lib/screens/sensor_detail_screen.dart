import 'package:flutter/material.dart';
import '../models/gas_sensor.dart';
import '../app/theme.dart';

class SensorDetailScreen extends StatelessWidget {
  final GasSensor sensor;

  const SensorDetailScreen({
    Key? key,
    required this.sensor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(sensor.config.name),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Text(
                      sensor.config.name,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Sensor Type: ${sensor.config.type}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      '${sensor.value.toStringAsFixed(2)} ${sensor.config.unit}',
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Configuration', style: TextStyle(fontWeight: FontWeight.bold)),
                    const Divider(),
                    ListTile(
                      title: const Text('Warning Threshold'),
                      trailing: Text('${sensor.config.warningThreshold} ${sensor.config.unit}'),
                    ),
                    ListTile(
                      title: const Text('Critical Threshold'),
                      trailing: Text('${sensor.config.highThreshold} ${sensor.config.unit}'),
                    ),
                    ListTile(
                      title: const Text('Max Range'),
                      trailing: Text('${sensor.config.maxRange} ${sensor.config.unit}'),
                    ),
                  ],
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}
