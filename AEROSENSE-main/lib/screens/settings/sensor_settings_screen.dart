import 'package:flutter/material.dart';
import '../../app/theme.dart';
import '../../config/sensor_config.dart';

class SensorSettingsScreen extends StatelessWidget {
  const SensorSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Sensor Settings'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: SensorConfig.defaultSensors.length,
        itemBuilder: (context, index) {
          final config = SensorConfig.defaultSensors[index];
          return Card(
            color: AppTheme.cardColor,
            margin: const EdgeInsets.only(bottom: 12),
            child: ExpansionTile(
              title: Text(config.name, style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
              subtitle: Text(config.unit, style: TextStyle(color: AppTheme.secondaryColor)),
              iconColor: AppTheme.primaryColor,
              collapsedIconColor: AppTheme.secondaryColor,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      _buildConfigRow('Key', config.key),
                      const Divider(),
                      _buildConfigRow('Low Threshold', '${config.warningThreshold}'),
                      const Divider(),
                      _buildConfigRow('High Threshold', '${config.highThreshold}'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Calibration coming soon')));
                        },
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor),
                        child: const Text('Calibrate Sensor'),
                      )
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildConfigRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: AppTheme.secondaryColor)),
        Text(value, style: TextStyle(color: AppTheme.textPrimary)),
      ],
    );
  }
}
