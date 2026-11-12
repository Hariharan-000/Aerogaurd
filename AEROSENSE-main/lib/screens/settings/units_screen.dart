import 'package:flutter/material.dart';
import '../../app/theme.dart';

class UnitsScreen extends StatefulWidget {
  const UnitsScreen({super.key});

  @override
  State<UnitsScreen> createState() => _UnitsScreenState();
}

class _UnitsScreenState extends State<UnitsScreen> {
  String _tempUnit = '°C';
  String _altUnit = 'm';
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Units'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildUnitSection('Temperature', ['°C', '°F'], _tempUnit, (val) => setState(() => _tempUnit = val!)),
          const SizedBox(height: 16),
          _buildUnitSection('Pressure', ['hPa'], 'hPa', (val) {}),
          const SizedBox(height: 16),
          _buildUnitSection('Altitude', ['m', 'ft'], _altUnit, (val) => setState(() => _altUnit = val!)),
        ],
      ),
    );
  }

  Widget _buildUnitSection(String title, List<String> options, String currentValue, void Function(String?) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Card(
          color: AppTheme.cardColor,
          child: Column(
            children: options.map((opt) => Column(
              children: [
                RadioListTile<String>(
                  title: Text(opt, style: TextStyle(color: AppTheme.textPrimary)),
                  value: opt,
                  groupValue: currentValue,
                  activeColor: AppTheme.primaryColor,
                  onChanged: onChanged,
                ),
                if (opt != options.last) const Divider(height: 1),
              ],
            )).toList(),
          ),
        ),
      ],
    );
  }
}
