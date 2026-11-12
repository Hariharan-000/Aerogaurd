import 'package:flutter/material.dart';
import '../app/theme.dart';
import 'settings/notifications_screen.dart';
import 'settings/location_settings_screen.dart';
import 'settings/appearance_screen.dart';
import 'settings/units_screen.dart';
import 'settings/language_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildListItem(context, Icons.notifications, 'Notifications', () => _nav(context, const NotificationsScreen())),
          _buildListItem(context, Icons.location_on, 'Location Settings', () => _nav(context, const LocationSettingsScreen())),
          _buildListItem(context, Icons.color_lens, 'App Appearance', () => _nav(context, const AppearanceScreen())),
          _buildListItem(context, Icons.straighten, 'Units', () => _nav(context, const UnitsScreen())),
          _buildListItem(context, Icons.language, 'Language', () => _nav(context, const LanguageScreen())),
        ],
      ),
    );
  }

  void _nav(BuildContext context, Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (context) => screen));
  }

  Widget _buildListItem(BuildContext context, IconData icon, String title, VoidCallback onTap) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: AppTheme.cardColor,
      child: ListTile(
        leading: Icon(icon, color: AppTheme.primaryColor),
        title: Text(title, style: const TextStyle(color: AppTheme.textPrimary)),
        trailing: const Icon(Icons.chevron_right, size: 16, color: AppTheme.secondaryColor),
        onTap: onTap,
      ),
    );
  }
}
