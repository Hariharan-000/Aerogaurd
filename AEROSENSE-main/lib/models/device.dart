enum ConnectionStatus { connected, connecting, disconnected, error }

class Device {
  final String id;
  final String name;
  ConnectionStatus status;
  DateTime lastSeen;

  Device({
    required this.id,
    required this.name,
    this.status = ConnectionStatus.disconnected,
    DateTime? lastSeen,
  }) : lastSeen = lastSeen ?? DateTime.now();

  Device copyWith({
    String? id,
    String? name,
    ConnectionStatus? status,
    DateTime? lastSeen,
  }) {
    return Device(
      id: id ?? this.id,
      name: name ?? this.name,
      status: status ?? this.status,
      lastSeen: lastSeen ?? this.lastSeen,
    );
  }
}
