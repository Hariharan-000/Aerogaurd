export function showConnectionModal(currentStatus, onToggleConnection) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-title">ESP32 BLE Link</span>
        <button id="modal-close-btn" class="icon-btn" style="width: 28px; height: 28px; font-size: 14px;">✕</button>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; padding: 12px 0;">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(6, 182, 212, 0.12); border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; position: relative;">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
            <path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"/>
          </svg>
          <div style="position: absolute; inset: -8px; border-radius: 50%; border: 1px dashed var(--primary); opacity: 0.5; animation: spinRadar 6s linear infinite;"></div>
        </div>
        <div style="margin-top: 14px; font-weight: 700; font-size: 15px;">AeroSense ESP32 Unit</div>
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px;">MAC: 3C:61:05:4A:8B:2E • BLE 5.0</div>
      </div>

      <div class="card" style="padding: 12px; font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Link State:</span>
          <strong style="color: ${currentStatus ? '#10B981' : '#EF4444'}">${currentStatus ? 'CONNECTED' : 'DISCONNECTED'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">RSSI Signal:</span>
          <strong>-62 dBm (Excellent)</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Transmission Rate:</span>
          <strong>0.5 Hz (2000 ms)</strong>
        </div>
      </div>

      <button id="modal-conn-toggle-btn" class="sim-btn ${currentStatus ? 'danger' : 'active'}" style="width: 100%; justify-content: center; padding: 10px; font-size: 13px;">
        ${currentStatus ? 'DISCONNECT FROM ESP32' : 'CONNECT TO ESP32'}
      </button>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => {
    if (backdrop.parentNode) document.body.removeChild(backdrop);
  };

  backdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.querySelector('#modal-conn-toggle-btn').addEventListener('click', () => {
    onToggleConnection();
    close();
  });
}
