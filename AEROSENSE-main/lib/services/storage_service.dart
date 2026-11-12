import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/measurement.dart';

class StorageService {
  static const String _historyKey = 'aerosense_history';

  Future<void> saveMeasurement(Measurement measurement) async {
    final prefs = await SharedPreferences.getInstance();
    
    // Retrieve existing history
    List<String> historyStrings = prefs.getStringList(_historyKey) ?? [];
    
    // Add new measurement
    historyStrings.add(jsonEncode(measurement.toJson()));
    
    // Save back
    await prefs.setStringList(_historyKey, historyStrings);
  }

  Future<List<Measurement>> getHistory() async {
    final prefs = await SharedPreferences.getInstance();
    List<String> historyStrings = prefs.getStringList(_historyKey) ?? [];
    
    return historyStrings.map((str) => Measurement.fromJson(jsonDecode(str))).toList();
  }

  Future<void> clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_historyKey);
  }
}
