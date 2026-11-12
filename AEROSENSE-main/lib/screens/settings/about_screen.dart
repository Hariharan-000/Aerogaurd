import 'package:flutter/material.dart';
import '../../app/theme.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('About AeroSense'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 32),
            Icon(Icons.air, size: 80, color: AppTheme.primaryColor),
            const SizedBox(height: 16),
            Text(
              'AeroSense',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Portable Air-Quality Monitoring Platform',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppTheme.secondaryColor,
              ),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.cardColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildInfoRow('Version', '1.0.0'),
                  const Divider(),
                  _buildInfoRow('Build Number', '2026.09.17'),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Features:',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppTheme.textPrimary,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildFeatureList([
              'Multi-gas monitoring',
              'Temperature and humidity monitoring',
              'Atmospheric pressure',
              'Altitude',
              'Drone/portable operation',
              'Wireless ESP32 connectivity',
              'Real-time monitoring',
              'Offline data storage',
              'Geographic measurement mapping',
            ]),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: AppTheme.secondaryColor)),
          Text(value, style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildFeatureList(List<String> features) {
    return Column(
      children: features.map((f) => Padding(
        padding: const EdgeInsets.only(bottom: 12.0),
        child: Row(
          children: [
            Icon(Icons.check_circle, color: AppTheme.primaryColor, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                f,
                style: TextStyle(color: AppTheme.textPrimary),
              ),
            ),
          ],
        ),
      )).toList(),
    );
  }
}
