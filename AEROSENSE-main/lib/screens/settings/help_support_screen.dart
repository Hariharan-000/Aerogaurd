import 'package:flutter/material.dart';
import '../../app/theme.dart';

class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Help & Support'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Frequently Asked Questions',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildFaqItem(
              context,
              'What happens when the ESP32 is disconnected?',
              'If the connection drops in Real-Time mode, all sensor values immediately reset to 0 to prevent displaying stale or inaccurate data.',
            ),
            _buildFaqItem(
              context,
              'How does Demo Mode work?',
              'Demo Mode uses a simulated, looping dataset to demonstrate the app\'s visualization capabilities without requiring physical hardware.',
            ),
            _buildFaqItem(
              context,
              'How do I connect the sensor pod?',
              'Turn on the ESP32 hardware, navigate to the Connections screen, wait for the app to scan, and tap on your ESP32 device to pair via Bluetooth Low Energy (BLE).',
            ),
            _buildFaqItem(
              context,
              'Why are sensor values showing 0?',
              'Values will show 0 if you are in Real-Time mode but are not actively connected to an ESP32, or if the ESP32 is sending zero-values due to sensor calibration issues.',
            ),
            _buildFaqItem(
              context,
              'How do I export measurements?',
              'Go to Explore > Data Settings > Export CSV. This will package the currently saved measurement history into a spreadsheet file.',
            ),
            _buildFaqItem(
              context,
              'How to use the India Map?',
              'Navigate to the MAP tab. If GPS data is present in the sensor stream, points will be plotted automatically. You can zoom, pan, and tap on markers to view historical readings.',
            ),
            const SizedBox(height: 32),
            Text(
              'Contact Support',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: Icon(Icons.email, color: AppTheme.primaryColor),
              title: Text('Email Support', style: TextStyle(color: AppTheme.textPrimary)),
              subtitle: Text('support@aerosense.app', style: TextStyle(color: AppTheme.secondaryColor)),
              tileColor: AppTheme.cardColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              onTap: () {
                // Future email action
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFaqItem(BuildContext context, String question, String answer) {
    return Card(
      color: AppTheme.cardColor,
      margin: const EdgeInsets.only(bottom: 8.0),
      child: ExpansionTile(
        title: Text(
          question,
          style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600),
        ),
        iconColor: AppTheme.primaryColor,
        collapsedIconColor: AppTheme.secondaryColor,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Text(
              answer,
              style: TextStyle(color: AppTheme.secondaryColor, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
