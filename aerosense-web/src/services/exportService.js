// Telemetry CSV Export Service
export function exportTelemetryCSV(history) {
  if (!history || history.length === 0) {
    alert('No telemetry data available to export yet.');
    return;
  }

  const headers = [
    'Timestamp',
    'DateTime',
    'Mode',
    'AQI',
    'AQI_Status',
    'Temperature_C',
    'Humidity_Pct',
    'Pressure_hPa',
    'Altitude_m',
    'Latitude',
    'Longitude',
    'Speed_kmh',
    'MQ2_Smoke_LPG_ppm',
    'MQ7_CO_ppm',
    'MQ135_AirQuality_ppm',
    'MQ4_Methane_ppm',
    'MQ8_Hydrogen_ppm',
    'MQ131_Ozone_ppb',
    'MQ137_Ammonia_ppm',
    'Battery_Pct'
  ];

  const rows = history.map(item => [
    item.timestamp,
    new Date(item.timestamp).toISOString(),
    item.mode,
    item.aqi,
    item.aqiStatus,
    item.temperature,
    item.humidity,
    item.pressure,
    item.altitude,
    item.latitude.toFixed(6),
    item.longitude.toFixed(6),
    item.speed,
    item.gases.gas1,
    item.gases.gas2,
    item.gases.gas3,
    item.gases.gas4,
    item.gases.gas5,
    item.gases.gas6,
    item.gases.gas7,
    item.batteryLevel
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AeroSense_Flight_Log_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
