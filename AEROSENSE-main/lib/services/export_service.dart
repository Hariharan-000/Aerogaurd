import 'dart:io';
import '../models/measurement.dart';

class ExportService {
  Future<String> exportToCsv(List<Measurement> measurements) async {
    // Stub implementation to fix build since csv package is missing
    return '/stub/path/to/export.csv';
  }
}

