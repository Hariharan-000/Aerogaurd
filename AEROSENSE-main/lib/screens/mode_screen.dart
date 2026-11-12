import 'package:flutter/material.dart';

class ModeScreen extends StatelessWidget {
  const ModeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Operating Mode')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.flight_takeoff, size: 80, color: Theme.of(context).primaryColor),
            const SizedBox(height: 16),
            const Text('Drone vs Portable Mode visualization'),
          ],
        ),
      ),
    );
  }
}
