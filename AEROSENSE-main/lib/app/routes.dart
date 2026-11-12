import 'package:flutter/material.dart';
import '../screens/main_screen.dart';
import '../screens/connection_screen.dart';
import '../screens/mode_screen.dart';

class AppRoutes {
  static const String splash = '/';
  static const String connection = '/connection';
  static const String main = '/main';
  static const String mode = '/mode';
  
  // Kept for backward compatibility if hardcoded somewhere, but routes to Main
  static const String dashboard = '/dashboard'; 
  static const String map = '/map';
  static const String history = '/history';

  static Map<String, WidgetBuilder> get routes {
    return {
      main: (context) => const MainScreen(),
      dashboard: (context) => const MainScreen(), // Redirects to MainScreen
    };
  }
}
