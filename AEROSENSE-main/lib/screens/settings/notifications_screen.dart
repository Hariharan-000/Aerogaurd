import 'package:flutter/material.dart';
import '../../app/theme.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          SwitchListTile(
            title: Text('Enable All Notifications', style: TextStyle(color: AppTheme.textPrimary)),
            value: true,
            activeColor: AppTheme.primaryColor,
            onChanged: (val) {},
            tileColor: AppTheme.cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          const SizedBox(height: 16),
          _buildNotificationSetting('High Pollution Alert', 'Notify when AQI drops below safe threshold', true),
          _buildNotificationSetting('Sensor Error Alert', 'Notify when a sensor goes offline or returns NaN', true),
          _buildNotificationSetting('ESP32 Disconnect Alert', 'Notify when connection is lost', true),
          _buildNotificationSetting('Low Battery Alert', 'Notify when drone battery is low', false),
        ],
      ),
    );
  }

  Widget _buildNotificationSetting(String title, String subtitle, bool initialValue) {
    return Card(
      color: AppTheme.cardColor,
      margin: const EdgeInsets.only(bottom: 8.0),
      child: SwitchListTile(
        title: Text(title, style: TextStyle(color: AppTheme.textPrimary)),
        subtitle: Text(subtitle, style: TextStyle(color: AppTheme.secondaryColor, fontSize: 12)),
        value: initialValue,
        activeColor: AppTheme.primaryColor,
        onChanged: (val) {},
      ),
    );
  }
}
