import 'package:flutter/material.dart';
import '../app/theme.dart';
import 'settings/device_settings_screen.dart';
import 'settings/sensor_settings_screen.dart';
import 'settings/data_settings_screen.dart';
import 'settings/notifications_screen.dart';
import 'settings/location_settings_screen.dart';
import 'settings/appearance_screen.dart';
import 'settings/units_screen.dart';
import 'settings/language_screen.dart';
import 'settings/help_support_screen.dart';
import 'settings/privacy_policy_screen.dart';
import 'settings/terms_conditions_screen.dart';
import 'settings/about_screen.dart';
import 'settings/diagnostics_screen.dart';
import 'settings/reset_screen.dart';
import 'settings_screen.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Explore & Configuration'),
        backgroundColor: AppTheme.cardColor,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _nav(context, const SettingsScreen()),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildCategoryHeader(context, 'DATA'),
          _buildListItem(context, Icons.data_usage, 'Data Settings & Export', () => _nav(context, const DataSettingsScreen())),

          _buildCategoryHeader(context, 'DRONE'),
          _buildListItem(context, Icons.flight, 'Drone Mode', () => _showNotImpl(context)),
          _buildListItem(context, Icons.backpack, 'Portable Mode', () => _showNotImpl(context)),
          _buildListItem(context, Icons.auto_graph, 'Flight Statistics', () => _showNotImpl(context)),

          _buildCategoryHeader(context, 'SENSORS'),
          _buildListItem(context, Icons.settings_input_component, 'Sensor Settings', () => _nav(context, const SensorSettingsScreen())),

          _buildCategoryHeader(context, 'DEVICES'),
          _buildListItem(context, Icons.devices, 'Device Settings', () => _nav(context, const DeviceSettingsScreen())),

          _buildCategoryHeader(context, 'ANALYSIS'),
          _buildListItem(context, Icons.bug_report, 'System Diagnostics', () => _nav(context, const DiagnosticsScreen())),

          _buildCategoryHeader(context, 'SYSTEM'),
          _buildListItem(context, Icons.notifications, 'Notifications', () => _nav(context, const NotificationsScreen())),
          _buildListItem(context, Icons.location_on, 'Location Settings', () => _nav(context, const LocationSettingsScreen())),
          _buildListItem(context, Icons.color_lens, 'App Appearance', () => _nav(context, const AppearanceScreen())),
          _buildListItem(context, Icons.straighten, 'Units', () => _nav(context, const UnitsScreen())),
          _buildListItem(context, Icons.language, 'Language', () => _nav(context, const LanguageScreen())),
          
          _buildCategoryHeader(context, 'SUPPORT & LEGAL'),
          _buildListItem(context, Icons.help_outline, 'Help & Support', () => _nav(context, const HelpSupportScreen())),
          _buildListItem(context, Icons.privacy_tip_outlined, 'Privacy Policy', () => _nav(context, const PrivacyPolicyScreen())),
          _buildListItem(context, Icons.gavel, 'Terms & Conditions', () => _nav(context, const TermsConditionsScreen())),
          _buildListItem(context, Icons.info_outline, 'About AeroSense', () => _nav(context, const AboutScreen())),
          
          _buildCategoryHeader(context, 'DANGER ZONE'),
          _buildListItem(context, Icons.warning_amber, 'Reset Options', () => _nav(context, const ResetScreen()), isDanger: true),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  void _nav(BuildContext context, Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (context) => screen));
  }

  void _showNotImpl(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feature coming soon in next update')));
  }

  Widget _buildCategoryHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 8, left: 16),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: AppTheme.primaryColor,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildListItem(BuildContext context, IconData icon, String title, VoidCallback onTap, {bool isDanger = false}) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: AppTheme.cardColor,
      child: ListTile(
        leading: Icon(icon, color: isDanger ? Colors.redAccent : AppTheme.primaryColor),
        title: Text(title, style: TextStyle(color: isDanger ? Colors.redAccent : AppTheme.textPrimary)),
        trailing: Icon(Icons.chevron_right, size: 16, color: AppTheme.secondaryColor),
        onTap: onTap,
      ),
    );
  }
}
