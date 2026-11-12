import 'package:flutter/material.dart';
import '../../app/theme.dart';

class LocationSettingsScreen extends StatelessWidget {
  const LocationSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Location Settings'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildLocationSetting('Location Permission', 'Granted', Icons.security),
          _buildLocationSetting('GPS Status', 'Active', Icons.gps_fixed),
          const SizedBox(height: 16),
          SwitchListTile(
            title: Text('Use Device Location', style: TextStyle(color: AppTheme.textPrimary)),
            subtitle: Text('Center map on current phone location', style: TextStyle(color: AppTheme.secondaryColor)),
            value: true,
            activeColor: AppTheme.primaryColor,
            onChanged: (val) {},
            tileColor: AppTheme.cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            title: Text('Measurement Location', style: TextStyle(color: AppTheme.textPrimary)),
            subtitle: Text('Use GPS coords embedded in sensor data', style: TextStyle(color: AppTheme.secondaryColor)),
            value: true,
            activeColor: AppTheme.primaryColor,
            onChanged: (val) {},
            tileColor: AppTheme.cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          const SizedBox(height: 16),
          ListTile(
            title: Text('Location Accuracy', style: TextStyle(color: AppTheme.textPrimary)),
            subtitle: Text('High Accuracy (GPS + Wi-Fi)', style: TextStyle(color: AppTheme.secondaryColor)),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
            tileColor: AppTheme.cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onTap: () {},
          )
        ],
      ),
    );
  }

  Widget _buildLocationSetting(String title, String status, IconData icon) {
    return Card(
      color: AppTheme.cardColor,
      margin: const EdgeInsets.only(bottom: 8.0),
      child: ListTile(
        leading: Icon(icon, color: AppTheme.primaryColor),
        title: Text(title, style: TextStyle(color: AppTheme.textPrimary)),
        trailing: Text(status, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
