import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app/theme.dart';
import 'app/routes.dart';

import 'providers/device_provider.dart';
import 'providers/sensor_provider.dart';
import 'providers/measurement_provider.dart';
import 'providers/data_source_provider.dart';

import 'screens/splash_screen.dart';
import 'screens/connection_screen.dart';
import 'screens/main_screen.dart';
import 'screens/map_screen.dart';
import 'screens/history_screen.dart';
import 'screens/mode_screen.dart';

import 'services/mock_esp32_service.dart';
import 'services/ble_service.dart';

void main() {
  final deviceProvider = DeviceProvider();
  final sensorProvider = SensorProvider();
  final measurementProvider = MeasurementProvider();
  
  final mockService = MockESP32Service();
  final bleService = BleService();
  
  final dataSourceProvider = DataSourceProvider(
    mockService,
    bleService,
    sensorProvider,
    measurementProvider,
    deviceProvider,
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: deviceProvider),
        ChangeNotifierProvider.value(value: sensorProvider),
        ChangeNotifierProvider.value(value: measurementProvider),
        ChangeNotifierProvider.value(value: dataSourceProvider),
      ],
      child: const AeroSenseApp(),
    ),
  );
}

class AeroSenseApp extends StatelessWidget {
  const AeroSenseApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AeroSense',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: AppRoutes.splash,
      routes: {
        AppRoutes.splash: (context) => const SplashScreen(),
        AppRoutes.connection: (context) => const ConnectionScreen(),
        AppRoutes.main: (context) => const MainScreen(),
        AppRoutes.dashboard: (context) => const MainScreen(),
        AppRoutes.map: (context) => const MapScreen(),
        AppRoutes.history: (context) => const HistoryScreen(),
        AppRoutes.mode: (context) => const ModeScreen(),
      },
    );
  }
}
