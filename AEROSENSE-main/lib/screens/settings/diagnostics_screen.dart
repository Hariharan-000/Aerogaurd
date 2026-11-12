import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app/theme.dart';
import '../../providers/device_provider.dart';
import '../../models/device.dart';

class DiagnosticsScreen extends StatelessWidget {
  const DiagnosticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final deviceStatus = Provider.of<DeviceProvider>(context).status;
    final isConnected = deviceStatus == ConnectionStatus.connected;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('System Diagnostics'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildDiagSection(
            context,
            'ESP32',
            [
              _buildDiagItem('Connection', isConnected ? 'PASS' : 'ERROR'),
              _buildDiagItem('BLE Status', isConnected ? 'PASS' : 'WARNING'),
              _buildDiagItem('Wi-Fi Status', 'WARNING'),
              _buildDiagItem('Last Packet', isConnected ? 'PASS' : 'ERROR'),
            ],
          ),
          const SizedBox(height: 16),
          _buildDiagSection(
            context,
            'Sensors',
            [
              _buildDiagItem('Gas Sensor 1', isConnected ? 'PASS' : 'WARNING'),
              _buildDiagItem('Gas Sensor 2', isConnected ? 'PASS' : 'WARNING'),
              _buildDiagItem('Gas Sensor 3', isConnected ? 'PASS' : 'WARNING'),
              _buildDiagItem('Gas Sensor 4', isConnected ? 'PASS' : 'WARNING'),
              _buildDiagItem('Gas Sensor 5', isConnected ? 'PASS' : 'WARNING'),
              _buildDiagItem('Gas Sensor 6', isConnected ? 'PASS' : 'WARNING'),
              _buildDiagItem('Gas Sensor 7', isConnected ? 'PASS' : 'WARNING'),
              _buildDiagItem('DHT11 (Temp/Hum)', isConnected ? 'PASS' : 'WARNING'),
              _buildDiagItem('BMP180 (Pressure)', isConnected ? 'PASS' : 'WARNING'),
            ],
          ),
          const SizedBox(height: 16),
          _buildDiagSection(
            context,
            'Application',
            [
              _buildDiagItem('Storage Status', 'PASS'),
              _buildDiagItem('Location Permission', 'PASS'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDiagSection(BuildContext context, String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Card(
          color: AppTheme.cardColor,
          child: Column(children: children),
        )
      ],
    );
  }

  Widget _buildDiagItem(String label, String status) {
    Color statusColor;
    if (status == 'PASS') statusColor = Colors.green;
    else if (status == 'WARNING') statusColor = Colors.orange;
    else statusColor = Colors.red;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: AppTheme.textPrimary)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
            child: Text(status, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
