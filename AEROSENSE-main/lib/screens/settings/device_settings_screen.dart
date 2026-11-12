import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app/theme.dart';
import '../../providers/device_provider.dart';
import '../../models/device.dart';

class DeviceSettingsScreen extends StatelessWidget {
  const DeviceSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final isConnected = deviceProvider.status == ConnectionStatus.connected;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Device Settings'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildInfoCard(
            context,
            title: 'Current Device',
            children: [
              _buildRow('Name', 'AeroSense_ESP32'),
              _buildRow('ID', 'ESP-8266-A1B2'),
              _buildRow('Status', isConnected ? 'Connected' : 'Disconnected', 
                valueColor: isConnected ? Colors.green : Colors.redAccent),
              _buildRow('Battery', isConnected ? '85%' : '--'),
              _buildRow('Firmware', 'v2.1.4'),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoCard(
            context,
            title: 'Connectivity',
            children: [
              SwitchListTile(
                title: Text('BLE Connection', style: TextStyle(color: AppTheme.textPrimary)),
                value: true,
                activeColor: AppTheme.primaryColor,
                onChanged: (val) {},
              ),
              SwitchListTile(
                title: Text('Wi-Fi Sync', style: TextStyle(color: AppTheme.textPrimary)),
                value: false,
                activeColor: AppTheme.primaryColor,
                onChanged: (val) {},
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, {required String title, required List<Widget> children}) {
    return Column(
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
        Card(
          color: AppTheme.cardColor,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(children: children),
          ),
        ),
      ],
    );
  }

  Widget _buildRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: AppTheme.secondaryColor)),
          Text(value, style: TextStyle(color: valueColor ?? AppTheme.textPrimary, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
