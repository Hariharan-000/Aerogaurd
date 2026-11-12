import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../app/theme.dart';
import '../providers/measurement_provider.dart';

enum MapLayerType {
  streets, // Google / OSM standard street style
  satellite, // Aerial / Satellite style
  terrain, // Topo / Terrain style
}

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  
  // Default fallback location (Center of India)
  final LatLng _defaultLocation = const LatLng(20.5937, 78.9629);
  
  LatLng? _deviceLocation;
  StreamSubscription<Position>? _positionStreamSub;
  bool _isLoadingLocation = true;
  String? _locationStatusMessage;

  bool _showFlightPath = true;
  bool _showMeasurements = true;
  MapLayerType _currentLayer = MapLayerType.streets;

  @override
  void initState() {
    super.initState();
    _initDeviceLocation();
  }

  @override
  void dispose() {
    _positionStreamSub?.cancel();
    super.dispose();
  }

  Future<void> _initDeviceLocation() async {
    setState(() {
      _isLoadingLocation = true;
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          setState(() {
            _locationStatusMessage = 'Location services are disabled on your phone.';
            _isLoadingLocation = false;
          });
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            setState(() {
              _locationStatusMessage = 'Location permissions denied.';
              _isLoadingLocation = false;
            });
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() {
            _locationStatusMessage = 'Location permissions permanently denied. Enable in Settings.';
            _isLoadingLocation = false;
          });
        }
        return;
      }

      // Get initial position quickly
      final currentPos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      if (mounted) {
        setState(() {
          _deviceLocation = LatLng(currentPos.latitude, currentPos.longitude);
          _isLoadingLocation = false;
        });
        _mapController.move(_deviceLocation!, 15.0);
      }

      // Listen to live GPS position updates from phone
      _positionStreamSub = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 5,
        ),
      ).listen((pos) {
        if (mounted) {
          setState(() {
            _deviceLocation = LatLng(pos.latitude, pos.longitude);
          });
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingLocation = false;
          _locationStatusMessage = 'Failed to fetch phone location: $e';
        });
      }
    }
  }

  void _centerOnCurrentLocation() {
    if (_deviceLocation != null) {
      _mapController.move(_deviceLocation!, 16.0);
    } else {
      _initDeviceLocation();
    }
  }

  String _getTileUrl() {
    switch (_currentLayer) {
      case MapLayerType.streets:
        // Google Maps Standard Street layer (high-speed, no access-denied policy)
        return 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      case MapLayerType.satellite:
        // Google Maps Hybrid (Satellite + Roads & Labels)
        return 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      case MapLayerType.terrain:
        // Google Maps Terrain / Relief layer
        return 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final measurements = Provider.of<MeasurementProvider>(context).history;

    // Filter points with valid sensor GPS
    final validPoints = measurements
        .where((m) => (m.latitude ?? 0.0) != 0.0 || (m.longitude ?? 0.0) != 0.0)
        .toList();

    final sensorPoints = validPoints.map((m) => LatLng(m.latitude ?? 0.0, m.longitude ?? 0.0)).toList();

    // Determine initial center: phone location > sensor point > fallback
    final initialCenter = _deviceLocation ?? (sensorPoints.isNotEmpty ? sensorPoints.last : _defaultLocation);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: initialCenter,
              initialZoom: _deviceLocation != null ? 15.0 : 11.0,
              minZoom: 3.0,
              maxZoom: 18.5,
            ),
            children: [
              TileLayer(
                urlTemplate: _getTileUrl(),
                subdomains: const ['0', '1', '2', '3'],
                maxZoom: 20,
                retinaMode: false,
              ),

              // Sensor Flight / Walk Path
              if (_showFlightPath && sensorPoints.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: sensorPoints,
                      color: AppTheme.primaryColor.withValues(alpha: 0.85),
                      strokeWidth: 4.0,
                    ),
                  ],
                ),

              // Historical/Sensor Reading Markers
              if (_showMeasurements && validPoints.isNotEmpty)
                MarkerLayer(
                  markers: validPoints.map((data) {
                    final aqi = _calculateAqi(data);
                    final color = _getAqiColor(aqi);

                    return Marker(
                      point: LatLng(data.latitude ?? 0.0, data.longitude ?? 0.0),
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: () => _showMeasurementDetails(context, data, aqi, color),
                        child: Icon(Icons.location_on, color: color, size: 38),
                      ),
                    );
                  }).toList(),
                ),

              // Google Map-style Mobile Phone Location Blue Dot & Pulse
              if (_deviceLocation != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _deviceLocation!,
                      width: 50,
                      height: 50,
                      child: Center(
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.blueAccent.withValues(alpha: 0.25),
                              ),
                            ),
                            Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: const Color(0xFF1A73E8), // Google Maps Blue
                                border: Border.all(color: Colors.white, width: 3),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.25),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  )
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
            ],
          ),

          // Top Info Banner when locating
          if (_isLoadingLocation)
            Positioned(
              top: MediaQuery.of(context).padding.top + 12,
              left: 20,
              right: 20,
              child: Card(
                color: AppTheme.cardColor.withValues(alpha: 0.92),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
                  child: Row(
                    children: [
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1A73E8)),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'Locating your device GPS...',
                        style: TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Message if location permission/service issue
          if (_locationStatusMessage != null && _deviceLocation == null)
            Positioned(
              top: MediaQuery.of(context).padding.top + 12,
              left: 20,
              right: 20,
              child: Card(
                color: Colors.orange.shade900.withValues(alpha: 0.95),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _locationStatusMessage!,
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ),
                      TextButton(
                        onPressed: _initDeviceLocation,
                        child: const Text('RETRY', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      )
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),

      // Map Controls (Google Maps-like controls)
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          // Map Type Switcher (Street, Satellite, Terrain)
          FloatingActionButton.small(
            heroTag: 'map_layer_switch',
            backgroundColor: Colors.white,
            foregroundColor: AppTheme.primaryColor,
            elevation: 4,
            child: const Icon(Icons.layers_outlined),
            tooltip: 'Change Map Style',
            onPressed: () {
              setState(() {
                if (_currentLayer == MapLayerType.streets) {
                  _currentLayer = MapLayerType.satellite;
                } else if (_currentLayer == MapLayerType.satellite) {
                  _currentLayer = MapLayerType.terrain;
                } else {
                  _currentLayer = MapLayerType.streets;
                }
              });
              ScaffoldMessenger.of(context).removeCurrentSnackBar();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Map View: ${_currentLayer.name.toUpperCase()}'),
                  duration: const Duration(seconds: 1),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
          const SizedBox(height: 8),

          // Toggle Sensor Trajectory
          FloatingActionButton.small(
            heroTag: 'map_flight_path',
            backgroundColor: Colors.white,
            foregroundColor: _showFlightPath ? AppTheme.secondaryColor : Colors.grey.shade600,
            elevation: 4,
            child: const Icon(Icons.timeline),
            tooltip: 'Toggle Sensor Path',
            onPressed: () {
              setState(() {
                _showFlightPath = !_showFlightPath;
              });
            },
          ),
          const SizedBox(height: 8),

          // Zoom In
          FloatingActionButton.small(
            heroTag: 'map_zoom_in',
            backgroundColor: Colors.white,
            foregroundColor: Colors.black87,
            elevation: 4,
            child: const Icon(Icons.add),
            onPressed: () {
              final zoom = _mapController.camera.zoom + 1;
              _mapController.move(_mapController.camera.center, zoom);
            },
          ),
          const SizedBox(height: 4),

          // Zoom Out
          FloatingActionButton.small(
            heroTag: 'map_zoom_out',
            backgroundColor: Colors.white,
            foregroundColor: Colors.black87,
            elevation: 4,
            child: const Icon(Icons.remove),
            onPressed: () {
              final zoom = _mapController.camera.zoom - 1;
              _mapController.move(_mapController.camera.center, zoom);
            },
          ),
          const SizedBox(height: 8),

          // Google Maps "My Location" Button (Blue active)
          FloatingActionButton(
            heroTag: 'map_my_location',
            backgroundColor: Colors.white,
            elevation: 6,
            tooltip: 'Center on my location',
            child: Icon(
              Icons.my_location,
              color: _deviceLocation != null ? const Color(0xFF1A73E8) : Colors.grey.shade700,
            ),
            onPressed: _centerOnCurrentLocation,
          ),
        ],
      ),
    );
  }

  int _calculateAqi(dynamic data) {
    double maxGas = 0;
    data.gases.forEach((key, value) {
      if (value > maxGas) maxGas = value;
    });

    if (maxGas < 50) return 80;
    if (maxGas < 100) return 60;
    return 20;
  }

  Color _getAqiColor(int aqi) {
    if (aqi >= 80) return Colors.green;
    if (aqi >= 50) return Colors.orange;
    return Colors.red;
  }

  void _showMeasurementDetails(BuildContext context, dynamic data, int aqi, Color color) {
    final timeStr = DateFormat('yyyy-MM-dd HH:mm:ss').format(
      DateTime.fromMillisecondsSinceEpoch(data.timestamp * 1000),
    );

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.cardColor,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Measurement Details',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppTheme.textPrimary),
                  ),
                  Icon(Icons.circle, color: color),
                ],
              ),
              const SizedBox(height: 8),
              Text(timeStr, style: TextStyle(color: AppTheme.secondaryColor)),
              const Divider(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildMiniStat('Temp', '${data.temperature.toStringAsFixed(1)}°C'),
                  _buildMiniStat('Hum', '${data.humidity.toStringAsFixed(1)}%'),
                  _buildMiniStat('Alt', '${data.altitude.toStringAsFixed(1)}m'),
                ],
              ),
              const SizedBox(height: 24),
              const Text('Gas Readings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              SizedBox(
                height: 120,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: data.gases.length,
                  itemBuilder: (context, index) {
                    final key = data.gases.keys.elementAt(index);
                    final val = data.gases[key];
                    return Container(
                      width: 80,
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.background,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(key.toUpperCase(), style: TextStyle(color: AppTheme.secondaryColor, fontSize: 12)),
                          const SizedBox(height: 8),
                          Text('${val?.toStringAsFixed(1)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    );
                  },
                ),
              )
            ],
          ),
        );
      },
    );
  }

  Widget _buildMiniStat(String label, String value) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: AppTheme.secondaryColor, fontSize: 12)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
      ],
    );
  }
}
