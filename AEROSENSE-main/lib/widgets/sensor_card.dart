import 'package:flutter/material.dart';
import '../models/gas_sensor.dart';
import '../app/theme.dart';

class SensorCard extends StatelessWidget {
  final GasSensor sensor;
  final VoidCallback? onTap;

  const SensorCard({
    Key? key,
    required this.sensor,
    this.onTap,
  }) : super(key: key);

  Color _getStatusColor() {
    switch (sensor.status) {
      case SensorStatus.normal:
        return AppTheme.normalStatus;
      case SensorStatus.warning:
        return AppTheme.warningStatus;
      case SensorStatus.high:
        return AppTheme.highStatus;
      case SensorStatus.unknown:
      default:
        return AppTheme.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor();
    final hasData = sensor.value >= 0;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      sensor.config.name,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: statusColor,
                      boxShadow: [
                        BoxShadow(
                          color: statusColor.withOpacity(0.5),
                          blurRadius: 4,
                          spreadRadius: 1,
                        )
                      ]
                    ),
                  )
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    hasData ? sensor.value.toStringAsFixed(1) : '--',
                    style: Theme.of(context).textTheme.displaySmall?.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    sensor.config.unit,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              LinearProgressIndicator(
                value: hasData ? (sensor.value / sensor.config.maxRange).clamp(0.0, 1.0) : 0,
                backgroundColor: AppTheme.background,
                valueColor: AlwaysStoppedAnimation<Color>(statusColor),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
