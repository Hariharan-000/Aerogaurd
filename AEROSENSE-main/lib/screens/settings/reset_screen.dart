import 'package:flutter/material.dart';
import '../../app/theme.dart';

class ResetScreen extends StatelessWidget {
  const ResetScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Reset Options'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Text(
            'Destructive Actions',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: Colors.redAccent,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildResetButton(
            context,
            'Reset Sensor Settings',
            'Restore default thresholds and names',
            Icons.sensors,
          ),
          _buildResetButton(
            context,
            'Reset App Preferences',
            'Restore theme, units, and layout to defaults',
            Icons.settings_backup_restore,
          ),
          _buildResetButton(
            context,
            'Clear Measurement History',
            'Delete all locally stored sensor logs',
            Icons.delete_sweep,
          ),
          const SizedBox(height: 32),
          _buildResetButton(
            context,
            'Factory Reset Everything',
            'Completely wipe all data and settings',
            Icons.warning,
            isCritical: true,
          ),
        ],
      ),
    );
  }

  Widget _buildResetButton(BuildContext context, String title, String subtitle, IconData icon, {bool isCritical = false}) {
    return Card(
      color: AppTheme.cardColor,
      margin: const EdgeInsets.only(bottom: 12.0),
      child: ListTile(
        leading: Icon(icon, color: isCritical ? Colors.red : AppTheme.primaryColor),
        title: Text(title, style: TextStyle(color: isCritical ? Colors.redAccent : AppTheme.textPrimary, fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle, style: TextStyle(color: AppTheme.secondaryColor)),
        onTap: () {
          _showConfirmDialog(context, title);
        },
      ),
    );
  }

  void _showConfirmDialog(BuildContext context, String title) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardColor,
        title: Text('Confirm', style: TextStyle(color: AppTheme.textPrimary)),
        content: Text('Are you sure you want to $title? This action cannot be undone.', style: TextStyle(color: AppTheme.secondaryColor)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('CANCEL', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$title completed.')));
            },
            child: const Text('RESET', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
