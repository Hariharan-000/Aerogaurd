import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';
import '../providers/sensor_provider.dart';
import '../providers/data_source_provider.dart';
import '../widgets/connection_indicator.dart';
import '../widgets/air_quality_indicator.dart';
import '../widgets/environmental_card.dart';
import '../app/routes.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final deviceProvider = context.watch<DeviceProvider>();
    final sensorProvider = context.watch<SensorProvider>();
    final dataSourceProvider = context.watch<DataSourceProvider>();
    
    final data = sensorProvider.latestData;

    return Scaffold(
      appBar: AppBar(
        title: const Text('AeroSense Overview'),
        actions: [
          IconButton(
            icon: const Icon(Icons.bluetooth),
            onPressed: () => Navigator.pushNamed(context, AppRoutes.connection),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {},
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Status Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  ConnectionIndicator(status: deviceProvider.status),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: dataSourceProvider.isDemoMode ? Colors.amber.withOpacity(0.2) : Colors.green.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: dataSourceProvider.isDemoMode ? Colors.amber : Colors.green,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.circle,
                              size: 10,
                              color: dataSourceProvider.isDemoMode ? Colors.amber : Colors.green,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              dataSourceProvider.isDemoMode ? 'DEMO' : 'LIVE',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: dataSourceProvider.isDemoMode ? Colors.amber[800] : Colors.green[800],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Chip(
                        label: Text(data?.mode ?? 'UNKNOWN'),
                        backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                        side: BorderSide.none,
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              // Air Quality
              AirQualityIndicator(
                aqi: sensorProvider.relativeAirQualityIndex,
                status: sensorProvider.airQualityStatus,
              ),
              const SizedBox(height: 24),

              // Environmental Row 1
              Row(
                children: [
                  Expanded(
                    child: EnvironmentalCard(
                      title: 'Temperature',
                      value: data != null ? data.temperature.toStringAsFixed(1) : '--',
                      unit: '°C',
                      icon: Icons.thermostat,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: EnvironmentalCard(
                      title: 'Humidity',
                      value: data != null ? data.humidity.toStringAsFixed(1) : '--',
                      unit: '%',
                      icon: Icons.water_drop,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Environmental Row 2
              Row(
                children: [
                  Expanded(
                    child: EnvironmentalCard(
                      title: 'Pressure',
                      value: data != null ? data.pressure.toStringAsFixed(0) : '--',
                      unit: 'hPa',
                      icon: Icons.speed,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: EnvironmentalCard(
                      title: 'Altitude',
                      value: data != null ? data.altitude.toStringAsFixed(1) : '--',
                      unit: 'm',
                      icon: Icons.flight,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              Text(
                'Gas Summary',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: sensorProvider.gasSensors.map((sensor) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(sensor.config.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                            Text('${sensor.value.toStringAsFixed(1)} ${sensor.config.unit}'),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
