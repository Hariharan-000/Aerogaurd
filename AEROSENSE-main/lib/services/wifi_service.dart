import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/sensor_data.dart';

class WifiService {
  WebSocketChannel? _channel;
  final StreamController<SensorData> _dataController = StreamController<SensorData>.broadcast();

  // Configure ESP32 IP and Port here
  // e.g., ws://192.168.4.1/ws
  final String _wsUrl = 'ws://192.168.4.1/ws';

  Stream<SensorData> get dataStream => _dataController.stream;

  void connect() {
    try {
      _channel = WebSocketChannel.connect(Uri.parse(_wsUrl));
      
      _channel!.stream.listen((message) {
        try {
          final Map<String, dynamic> jsonData = jsonDecode(message);
          final sensorData = SensorData.fromJson(jsonData);
          _dataController.add(sensorData);
        } catch (e) {
          print('Error parsing WebSocket message: $e');
        }
      }, onError: (error) {
        print('WebSocket error: $error');
        disconnect();
      }, onDone: () {
        print('WebSocket connection closed');
        disconnect();
      });
    } catch (e) {
      print('Failed to connect to WebSocket: $e');
    }
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
  }

  void dispose() {
    disconnect();
    _dataController.close();
  }
}
