import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app/theme.dart';
import '../../providers/data_source_provider.dart';

class DataSettingsScreen extends StatelessWidget {
  const DataSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dataSource = Provider.of<DataSourceProvider>(context);
    
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Data Settings'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Text(
            'Data Source',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppTheme.textPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Choose where the application gets its sensor data.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppTheme.secondaryColor,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            color: AppTheme.cardColor,
            child: Column(
              children: [
                RadioListTile<bool>(
                  title: Text('Real-Time Data (Default)', style: TextStyle(color: AppTheme.textPrimary)),
                  subtitle: Text('Stream data from connected ESP32 hardware. Values are 0 if disconnected.', style: TextStyle(color: AppTheme.secondaryColor)),
                  value: false,
                  groupValue: dataSource.isDemoMode,
                  activeColor: AppTheme.primaryColor,
                  onChanged: (bool? value) {
                    if (value != null) {
                      dataSource.setDemoMode(value);
                    }
                  },
                ),
                const Divider(height: 1),
                RadioListTile<bool>(
                  title: Text('Demo Mode', style: TextStyle(color: AppTheme.textPrimary)),
                  subtitle: Text('Simulate data for demonstration purposes.', style: TextStyle(color: AppTheme.secondaryColor)),
                  value: true,
                  groupValue: dataSource.isDemoMode,
                  activeColor: AppTheme.primaryColor,
                  onChanged: (bool? value) {
                    if (value != null) {
                      dataSource.setDemoMode(value);
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          Text(
            'Data Management',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppTheme.textPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          ListTile(
            leading: const Icon(Icons.download, color: Colors.blue),
            title: Text('Export CSV', style: TextStyle(color: AppTheme.textPrimary)),
            subtitle: Text('Save history to file', style: TextStyle(color: AppTheme.secondaryColor)),
            tileColor: AppTheme.cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Export functionality coming soon!')),
              );
            },
          ),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.delete_sweep, color: Colors.redAccent),
            title: Text('Clear History', style: TextStyle(color: AppTheme.textPrimary)),
            tileColor: AppTheme.cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('History cleared (placeholder).')),
              );
            },
          ),
        ],
      ),
    );
  }
}
