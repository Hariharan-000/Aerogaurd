import 'package:flutter/material.dart';
import '../../app/theme.dart';

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Terms & Conditions'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Terms & Conditions',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildSection(context, '1. Acceptance of Terms', 'By using AeroSense, you agree to these Terms & Conditions.'),
            _buildSection(context, '2. Use of the Application', 'AeroSense is designed to display and log air-quality data from compatible ESP32 hardware.'),
            _buildSection(context, '3. Sensor Data', 'Sensor readings depend on the connected hardware, sensor calibration, environmental conditions, and measurement limitations. AeroSense does not provide certified environmental or regulatory measurements.'),
            _buildSection(context, '4. Demo Mode', 'Demo Mode uses simulated data and is intended for demonstration purposes only.'),
            _buildSection(context, '5. Real-Time Data', 'Real-Time data relies on active connectivity to compatible hardware.'),
            _buildSection(context, '6. Location Services', 'Location services are used locally to map measurement data.'),
            _buildSection(context, '7. Data Accuracy', 'We do not guarantee the absolute accuracy of the sensor readings. Users must verify critical data independently.'),
            _buildSection(context, '8. Hardware Responsibility', 'Users are responsible for properly configuring and maintaining the connected ESP32 hardware and sensors.'),
            _buildSection(context, '9. User Responsibility', 'Users must operate drones and carry portable equipment safely and in accordance with local regulations.'),
            _buildSection(context, '10. Software Updates', 'We may periodically release updates to improve functionality or security.'),
            _buildSection(context, '11. Limitation of Liability', 'AeroSense shall not be liable for any damages arising out of the use or inability to use the application or hardware.'),
            _buildSection(context, '12. Changes to Terms', 'We reserve the right to modify these terms at any time.'),
            _buildSection(context, '13. Contact Information', 'For support, please contact the AeroSense development team.'),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            content,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppTheme.textPrimary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
