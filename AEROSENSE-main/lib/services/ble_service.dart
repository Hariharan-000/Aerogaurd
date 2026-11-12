import 'dart:async';
import 'dart:convert';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../models/sensor_data.dart';

class BleService {
  BluetoothDevice? _device;
  BluetoothCharacteristic? _dataCharacteristic;
  StreamSubscription<List<int>>? _characteristicSubscription;
  final StreamController<SensorData> _dataController = StreamController<SensorData>.broadcast();

  // Configure your ESP32 BLE UUIDs here
  static const String _serviceUuid = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  static const String _characteristicUuid = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  Stream<SensorData> get dataStream => _dataController.stream;

  Future<void> connect(BluetoothDevice device) async {
    _device = device;
    
    try {
      await _device!.connect(license: License.nonprofit);
      
      // Discover services
      List<BluetoothService> services = await _device!.discoverServices();
      
      for (var service in services) {
        if (service.uuid.toString() == _serviceUuid) {
          for (var characteristic in service.characteristics) {
            if (characteristic.uuid.toString() == _characteristicUuid) {
              _dataCharacteristic = characteristic;
              
              await _dataCharacteristic!.setNotifyValue(true);
              _characteristicSubscription = _dataCharacteristic!.lastValueStream.listen((value) {
                if (value.isNotEmpty) {
                  try {
                    String jsonString = utf8.decode(value);
                    final jsonData = jsonDecode(jsonString);
                    _dataController.add(SensorData.fromJson(jsonData));
                  } catch (e) {
                    print('Error decoding BLE data: $e');
                  }
                }
              });
            }
          }
        }
      }
    } catch (e) {
      print('Error connecting to BLE device: $e');
      disconnect();
    }
  }

  Future<void> disconnect() async {
    await _characteristicSubscription?.cancel();
    _characteristicSubscription = null;
    
    await _dataCharacteristic?.setNotifyValue(false);
    _dataCharacteristic = null;
    
    await _device?.disconnect();
    _device = null;
  }
  
  void dispose() {
    disconnect();
    _dataController.close();
  }
}
