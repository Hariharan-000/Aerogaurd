import 'package:flutter/material.dart';
import '../models/device.dart';
import '../app/theme.dart';

class ConnectionIndicator extends StatelessWidget {
  final ConnectionStatus status;

  const ConnectionIndicator({
    Key? key,
    required this.status,
  }) : super(key: key);

  Color _getColor() {
    switch (status) {
      case ConnectionStatus.connected:
        return AppTheme.normalStatus;
      case ConnectionStatus.connecting:
        return AppTheme.warningStatus;
      case ConnectionStatus.error:
        return AppTheme.highStatus;
      case ConnectionStatus.disconnected:
      default:
        return AppTheme.textSecondary;
    }
  }

  String _getText() {
    switch (status) {
      case ConnectionStatus.connected:
        return 'Connected';
      case ConnectionStatus.connecting:
        return 'Connecting...';
      case ConnectionStatus.error:
        return 'Connection Error';
      case ConnectionStatus.disconnected:
      default:
        return 'Disconnected';
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getColor();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color,
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.6),
                blurRadius: 4,
                spreadRadius: 1,
              )
            ]
          ),
        ),
        const SizedBox(width: 8),
        Text(
          _getText(),
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}
