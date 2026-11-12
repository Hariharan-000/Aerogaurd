import 'package:flutter/material.dart';
import '../app/theme.dart';

class AirQualityIndicator extends StatelessWidget {
  final int aqi;
  final String status;

  const AirQualityIndicator({
    Key? key,
    required this.aqi,
    required this.status,
  }) : super(key: key);

  Color _getStatusColor() {
    if (aqi >= 80) return AppTheme.normalStatus;
    if (aqi >= 50) return Colors.yellow;
    if (aqi >= 20) return AppTheme.warningStatus;
    return AppTheme.highStatus;
  }

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor();
    
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.1),
            blurRadius: 20,
            spreadRadius: 2,
          )
        ],
        border: Border.all(color: color.withOpacity(0.3), width: 2),
      ),
      child: Column(
        children: [
          const Text(
            'RELATIVE AIR QUALITY',
            style: TextStyle(
              color: AppTheme.textSecondary,
              letterSpacing: 2,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 16),
          Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: 150,
                height: 150,
                child: CircularProgressIndicator(
                  value: aqi / 100,
                  strokeWidth: 12,
                  backgroundColor: AppTheme.background,
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    aqi.toString(),
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      color: color,
                    ),
                  ),
                  Text(
                    'INDEX',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              status,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
          )
        ],
      ),
    );
  }
}
