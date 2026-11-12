export const SENSOR_CONFIGS = [
  {
    key: 'gas1',
    name: 'Smoke / LPG',
    type: 'MQ-2',
    unit: 'ppm',
    warningThreshold: 300,
    highThreshold: 800,
    maxRange: 1000,
    color: '#F59E0B',
    description: 'Detects combustible gases, smoke, LPG, and propane in air.'
  },
  {
    key: 'gas2',
    name: 'Carbon Monoxide',
    type: 'MQ-7',
    unit: 'ppm',
    warningThreshold: 50,
    highThreshold: 150,
    maxRange: 500,
    color: '#EF4444',
    description: 'High sensitivity to toxic Carbon Monoxide (CO) emissions.'
  },
  {
    key: 'gas3',
    name: 'Air Quality (VOC)',
    type: 'MQ-135',
    unit: 'ppm',
    warningThreshold: 400,
    highThreshold: 1000,
    maxRange: 2000,
    color: '#06B6D4',
    description: 'Broadband sensor for NH3, NOx, alcohol, benzene, and smoke.'
  },
  {
    key: 'gas4',
    name: 'Methane (CH4)',
    type: 'MQ-4',
    unit: 'ppm',
    warningThreshold: 500,
    highThreshold: 1000,
    maxRange: 2000,
    color: '#10B981',
    description: 'Natural gas and methane detection for industrial leaks.'
  },
  {
    key: 'gas5',
    name: 'Hydrogen Gas',
    type: 'MQ-8',
    unit: 'ppm',
    warningThreshold: 100,
    highThreshold: 500,
    maxRange: 1000,
    color: '#8B5CF6',
    description: 'Highly sensitive to clean H2 gas concentrations.'
  },
  {
    key: 'gas6',
    name: 'Ozone (O3)',
    type: 'MQ-131',
    unit: 'ppb',
    warningThreshold: 50,
    highThreshold: 100,
    maxRange: 500,
    color: '#EC4899',
    description: 'Detects surface-level ozone and photochemical smog.'
  },
  {
    key: 'gas7',
    name: 'Ammonia (NH3)',
    type: 'MQ-137',
    unit: 'ppm',
    warningThreshold: 20,
    highThreshold: 50,
    maxRange: 200,
    color: '#F97316',
    description: 'Agricultural and chemical leak monitoring of ammonia.'
  }
];

export function getSensorStatus(value, config) {
  if (value >= config.highThreshold) return { label: 'CRITICAL', color: '#EF4444', level: 'high' };
  if (value >= config.warningThreshold) return { label: 'WARNING', color: '#F59E0B', level: 'warning' };
  return { label: 'NORMAL', color: '#10B981', level: 'normal' };
}

export function computeAQI(gases) {
  // Weighted normalized calculation based on MQ gas sensor ratios
  let maxRatio = 0;
  for (const cfg of SENSOR_CONFIGS) {
    const val = gases[cfg.key] || 0;
    const ratio = (val / cfg.highThreshold) * 100;
    if (ratio > maxRatio) maxRatio = ratio;
  }
  
  const score = Math.min(500, Math.round(maxRatio * 1.5));
  
  if (score <= 50) return { aqi: score, status: 'GOOD', color: '#10B981', text: 'Air quality is satisfactory with little or no risk.' };
  if (score <= 100) return { aqi: score, status: 'MODERATE', color: '#F59E0B', text: 'Acceptable air quality; some sensitive individuals may feel mild effects.' };
  if (score <= 200) return { aqi: score, status: 'UNHEALTHY', color: '#F97316', text: 'Adverse health impacts possible for sensitive groups.' };
  return { aqi: score, status: 'HAZARDOUS', color: '#EF4444', text: 'Emergency warning: High pollution event detected by drone.' };
}
