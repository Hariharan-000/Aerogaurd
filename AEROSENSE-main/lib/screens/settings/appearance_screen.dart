import 'package:flutter/material.dart';
import '../../app/theme.dart';

class AppearanceScreen extends StatefulWidget {
  const AppearanceScreen({super.key});

  @override
  State<AppearanceScreen> createState() => _AppearanceScreenState();
}

class _AppearanceScreenState extends State<AppearanceScreen> {
  String _themeMode = 'Dark Theme';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('App Appearance'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Text('Theme', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Card(
            color: AppTheme.cardColor,
            child: Column(
              children: [
                _buildThemeRadio('Light Theme'),
                const Divider(height: 1),
                _buildThemeRadio('Dark Theme'),
                const Divider(height: 1),
                _buildThemeRadio('System Default'),
              ],
            ),
          ),
          const SizedBox(height: 32),
          Text('Layout', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          SwitchListTile(
            title: Text('Compact Dashboard Layout', style: TextStyle(color: AppTheme.textPrimary)),
            subtitle: Text('Reduce padding to show more sensors on screen', style: TextStyle(color: AppTheme.secondaryColor)),
            value: false,
            activeColor: AppTheme.primaryColor,
            onChanged: (val) {},
            tileColor: AppTheme.cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeRadio(String title) {
    return RadioListTile<String>(
      title: Text(title, style: TextStyle(color: AppTheme.textPrimary)),
      value: title,
      groupValue: _themeMode,
      activeColor: AppTheme.primaryColor,
      onChanged: (val) {
        setState(() {
          _themeMode = val!;
        });
      },
    );
  }
}
