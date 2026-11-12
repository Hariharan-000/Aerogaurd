import { SENSOR_CONFIGS, getSensorStatus } from '../services/sensorConfig.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let chartInstance = null;
let currentMetricKey = 'gas1';

export function renderMonitorScreen(container, data, history, onSelectMetric) {
  const { gases, temperature, humidity } = data;

  container.innerHTML = `
    <div style="padding: 16px;">
      <div class="section-title">
        <span>Active Sensor Array</span>
        <span style="font-size: 11px; color: var(--primary-light);">Tap card to graph</span>
      </div>

      <!-- 7 Gas Sensors Grid -->
      <div class="gas-grid">
        ${SENSOR_CONFIGS.map(cfg => {
          const val = gases[cfg.key] || 0;
          const status = getSensorStatus(val, cfg);
          const percent = Math.min(100, Math.round((val / cfg.highThreshold) * 100));
          const isSelected = cfg.key === currentMetricKey;

          return `
            <div class="gas-card ${isSelected ? 'selected' : ''}" data-key="${cfg.key}">
              <div class="gas-card-top">
                <span class="gas-sensor-type">${cfg.type}</span>
                <span class="gas-status-dot" style="background: ${status.color}; box-shadow: 0 0 6px ${status.color};"></span>
              </div>
              <div class="gas-card-name">${cfg.name}</div>
              <div>
                <span class="gas-card-val">${val.toFixed(1)}</span>
                <span class="gas-card-unit">${cfg.unit}</span>
              </div>
              <div class="gas-bar-track">
                <div class="gas-bar-fill" style="width: ${percent}%; background: ${status.color};"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Real-Time Telemetry Graph -->
      <div class="chart-container" style="margin: 20px 0 0;">
        <div class="chart-header">
          <span style="font-size: 14px; font-weight: 700; color: var(--text-main);">Real-Time Telemetry</span>
          <select id="chart-metric-select" class="sim-select" style="background: var(--bg-surface-3);">
            ${SENSOR_CONFIGS.map(cfg => `
              <option value="${cfg.key}" ${cfg.key === currentMetricKey ? 'selected' : ''}>${cfg.name} (${cfg.type})</option>
            `).join('')}
            <option value="temperature" ${currentMetricKey === 'temperature' ? 'selected' : ''}>Temperature (°C)</option>
            <option value="humidity" ${currentMetricKey === 'humidity' ? 'selected' : ''}>Humidity (%)</option>
          </select>
        </div>

        <div style="height: 220px; position: relative;">
          <canvas id="telemetry-chart-canvas"></canvas>
        </div>

        <!-- Telemetry Min/Max/Avg Stats -->
        <div class="chart-stats-row" id="chart-stats-bar">
          <div class="chart-stat-item">CUR: <strong id="stat-cur">--</strong></div>
          <div class="chart-stat-item">MIN: <strong id="stat-min">--</strong></div>
          <div class="chart-stat-item">MAX: <strong id="stat-max">--</strong></div>
          <div class="chart-stat-item">AVG: <strong id="stat-avg">--</strong></div>
        </div>
      </div>
    </div>
  `;

  // Attach card click handlers
  container.querySelectorAll('.gas-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-key');
      currentMetricKey = key;
      const select = container.querySelector('#chart-metric-select');
      if (select) select.value = key;
      container.querySelectorAll('.gas-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateChart(history, currentMetricKey);
    });
  });

  // Attach select change handler
  const select = container.querySelector('#chart-metric-select');
  if (select) {
    select.addEventListener('change', (e) => {
      currentMetricKey = e.target.value;
      container.querySelectorAll('.gas-card').forEach(c => {
        if (c.getAttribute('data-key') === currentMetricKey) {
          c.classList.add('selected');
        } else {
          c.classList.remove('selected');
        }
      });
      updateChart(history, currentMetricKey);
    });
  }

  // Initialize Chart.js
  const canvas = container.querySelector('#telemetry-chart-canvas');
  if (canvas) {
    initChart(canvas, history, currentMetricKey);
  }
}

function initChart(canvas, history, metricKey) {
  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

  const points = getPointsForMetric(history, metricKey);

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.labels,
      datasets: [{
        label: getMetricLabel(metricKey),
        data: points.values,
        borderColor: '#06B6D4',
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#38BDF8',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748B', font: { size: 9, family: 'JetBrains Mono' }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94A3B8', font: { size: 10, family: 'JetBrains Mono' } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0F172A',
          borderColor: 'rgba(6, 182, 212, 0.4)',
          borderWidth: 1,
          titleFont: { family: 'JetBrains Mono', size: 11 },
          bodyFont: { family: 'JetBrains Mono', size: 12 },
          displayColors: false
        }
      }
    }
  });

  updateStatsBar(points.values);
}

export function updateChart(history, metricKey = currentMetricKey) {
  if (!chartInstance) return;
  const points = getPointsForMetric(history, metricKey);
  chartInstance.data.labels = points.labels;
  chartInstance.data.datasets[0].data = points.values;
  chartInstance.data.datasets[0].label = getMetricLabel(metricKey);
  chartInstance.update('none');

  updateStatsBar(points.values);
}

function getPointsForMetric(history, key) {
  const slice = history.slice(-30);
  const labels = slice.map(h => {
    const d = new Date(h.timestamp);
    return `${d.getMinutes()}:${d.getSeconds().toString().padStart(2, '0')}`;
  });

  const values = slice.map(h => {
    if (key === 'temperature') return h.temperature;
    if (key === 'humidity') return h.humidity;
    return h.gases[key] || 0;
  });

  return { labels, values };
}

function getMetricLabel(key) {
  if (key === 'temperature') return 'Temperature (°C)';
  if (key === 'humidity') return 'Humidity (%)';
  const cfg = SENSOR_CONFIGS.find(c => c.key === key);
  return cfg ? `${cfg.name} (${cfg.unit})` : key;
}

function updateStatsBar(values) {
  if (!values || values.length === 0) return;
  const cur = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const curEl = document.getElementById('stat-cur');
  const minEl = document.getElementById('stat-min');
  const maxEl = document.getElementById('stat-max');
  const avgEl = document.getElementById('stat-avg');

  if (curEl) curEl.textContent = cur.toFixed(1);
  if (minEl) minEl.textContent = min.toFixed(1);
  if (maxEl) maxEl.textContent = max.toFixed(1);
  if (avgEl) avgEl.textContent = avg.toFixed(1);
}
