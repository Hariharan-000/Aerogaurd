import 'package:flutter/material.dart';
import '../../app/theme.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Privacy Policy'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Privacy Policy',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildSection(
              context,
              'Data Collection',
              'AeroSense processes environmental sensor data collected from the connected air-quality monitoring device.\n\n'
              'Data collected may include:\n'
              '- Gas sensor readings\n'
              '- Temperature\n'
              '- Humidity\n'
              '- Atmospheric pressure\n'
              '- Altitude\n'
              '- GPS/location data when location functionality is enabled\n'
              '- Device information'
            ),
            _buildSection(
              context,
              'Data Usage',
              'Sensor data is used to display, analyze, visualize, and store environmental measurements within the application.'
            ),
            _buildSection(
              context,
              'Location',
              'Location data is used only for mapping and associating measurements with geographical locations when the user enables location functionality.'
            ),
            _buildSection(
              context,
              'Connectivity',
              'AeroSense may communicate with compatible ESP32 hardware through supported wireless connections such as Bluetooth or Wi-Fi.'
            ),
            _buildSection(
              context,
              'Data Storage',
              'Locally stored measurements remain available for viewing and export from the application. We do not transmit or store your personal environmental data on any external cloud servers.'
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
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
          const SizedBox(height: 8),
          Text(
            content,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppTheme.textPrimary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
