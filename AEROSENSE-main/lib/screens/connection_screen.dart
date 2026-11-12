import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';
import '../models/device.dart';
import '../widgets/connection_indicator.dart';
import '../app/theme.dart';

class ConnectionScreen extends StatelessWidget {
  const ConnectionScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final deviceProvider = context.watch<DeviceProvider>();
    final isConnected = deviceProvider.status == ConnectionStatus.connected;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Device Connection'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Icon(
                      isConnected ? Icons.wifi : Icons.wifi_off,
                      size: 64,
                      color: isConnected ? AppTheme.normalStatus : AppTheme.textSecondary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'ESP32 Status',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    ConnectionIndicator(status: deviceProvider.status),
                    const SizedBox(height: 16),
                    Text(
                      'Device ID: ${deviceProvider.device.id}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.link),
                    label: const Text('CONNECT'),
                    onPressed: isConnected ? null : () {
                      // Trigger connect logic (using MockESP32 for now)
                      deviceProvider.setStatus(ConnectionStatus.connecting);
                      Future.delayed(const Duration(seconds: 2), () {
                        deviceProvider.updateDevice(Device(
                          id: 'AERO_001_MOCK',
                          name: 'AeroSense ESP32',
                          status: ConnectionStatus.connected,
                        ));
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.link_off),
                    label: const Text('DISCONNECT'),
                    onPressed: !isConnected ? null : () {
                      deviceProvider.setStatus(ConnectionStatus.disconnected);
                    },
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      foregroundColor: AppTheme.primaryColor,
                      side: const BorderSide(color: AppTheme.primaryColor),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
