import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/sensor_provider.dart';
import '../providers/measurement_provider.dart';
import '../widgets/sensor_card.dart';
import '../widgets/sensor_chart.dart';

class MonitorScreen extends StatefulWidget {
  const MonitorScreen({Key? key}) : super(key: key);

  @override
  State<MonitorScreen> createState() => _MonitorScreenState();
}

class _MonitorScreenState extends State<MonitorScreen> {
  String _selectedGraphMetric = 'gas1';

  @override
  Widget build(BuildContext context) {
    final sensorProvider = context.watch<SensorProvider>();
    final measurementProvider = context.watch<MeasurementProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detailed Monitoring'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Gas Sensors',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            
            // Gas Sensors Grid
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.2,
              ),
              itemCount: sensorProvider.gasSensors.length,
              itemBuilder: (context, index) {
                final sensor = sensorProvider.gasSensors[index];
                return SensorCard(
                  sensor: sensor,
                  onTap: () {
                    setState(() {
                      _selectedGraphMetric = sensor.config.key;
                    });
                  },
                );
              },
            ),
            const SizedBox(height: 24),

            // Real-time Graph
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Real-Time Graph',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                DropdownButton<String>(
                  value: _selectedGraphMetric,
                  items: [
                    ...sensorProvider.gasSensors.map((s) => DropdownMenuItem(
                      value: s.config.key,
                      child: Text(s.config.name),
                    )),
                    const DropdownMenuItem(value: 'temperature', child: Text('Temperature')),
                    const DropdownMenuItem(value: 'humidity', child: Text('Humidity')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedGraphMetric = val);
                  },
                )
              ],
            ),
            const SizedBox(height: 16),
            SensorChart(
              dataPoints: measurementProvider.sessionData,
              metricKey: _selectedGraphMetric,
              title: 'Live Data - $_selectedGraphMetric',
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
