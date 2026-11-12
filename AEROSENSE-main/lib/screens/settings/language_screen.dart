import 'package:flutter/material.dart';
import '../../app/theme.dart';

class LanguageScreen extends StatelessWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Language'),
        backgroundColor: AppTheme.cardColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Card(
            color: AppTheme.cardColor,
            child: ListTile(
              leading: const Icon(Icons.language, color: Colors.blueAccent),
              title: Text('English', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
              trailing: Icon(Icons.check, color: AppTheme.primaryColor),
            ),
          ),
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text(
              'Additional languages will be added in future updates based on user feedback and localization efforts.',
              style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic),
              textAlign: TextAlign.center,
            ),
          )
        ],
      ),
    );
  }
}
