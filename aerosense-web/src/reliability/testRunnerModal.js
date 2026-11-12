/**
 * AERO GUARD - Reliability Module
 * In-App Interactive Unit Test Runner Modal
 */

import { runAllReliabilityUnitTests } from './reliabilityModule.test.js';

export function showTestRunnerModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.zIndex = '9999';

  backdrop.innerHTML = `
    <div class="modal-card" style="max-width: 520px; max-height: 85vh; display: flex; flex-direction: column;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🧪</span>
          <span class="modal-title">Reliability Module Unit Tests</span>
        </div>
        <button id="test-close-btn" class="icon-btn">✕</button>
      </div>

      <div style="padding: 8px 0; font-size: 12px; color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.08);">
        Executes automated test assertions covering Priorities 1 & 2 requirements.
      </div>

      <div id="test-results-container" style="flex: 1; overflow-y: auto; padding: 12px 0; min-height: 250px;">
        <div style="display: flex; align-items: center; justify-content: center; height: 180px; color: var(--primary);">
          <div style="text-align: center;">
            <div class="splash-loader-bar" style="width: 140px; margin: 0 auto 12px;"></div>
            <span>Executing test suites...</span>
          </div>
        </div>
      </div>

      <div style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
        <div id="test-summary-pill" style="font-size: 12px; font-weight: 700;"></div>
        <div style="display: flex; gap: 8px;">
          <button id="test-rerun-btn" class="sim-btn" style="padding: 6px 12px; font-size: 11px;">RERUN TESTS</button>
          <button id="test-done-btn" class="sim-btn active" style="padding: 6px 16px; font-size: 11px;">DONE</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => {
    if (backdrop.parentNode) document.body.removeChild(backdrop);
  };

  backdrop.querySelector('#test-close-btn').addEventListener('click', close);
  backdrop.querySelector('#test-done-btn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  const runTests = async () => {
    const container = backdrop.querySelector('#test-results-container');
    const summaryPill = backdrop.querySelector('#test-summary-pill');
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 180px; color: var(--primary);">
        <div style="text-align: center;">
          <div class="splash-loader-bar" style="width: 140px; margin: 0 auto 12px;"></div>
          <span>Executing test suites...</span>
        </div>
      </div>
    `;

    const outcome = await runAllReliabilityUnitTests();

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${outcome.results.map((r, i) => `
          <div style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: 4px; background: ${r.passed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.15)'}; font-size: 11px;">
            <span style="font-weight: 800; color: ${r.passed ? '#10B981' : '#EF4444'};">${r.passed ? '✓ PASS' : '✗ FAIL'}</span>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: var(--text-main);">${r.name}</div>
              ${r.details ? `<div style="color: var(--text-muted); font-size: 10px; margin-top: 2px;">${r.details}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    summaryPill.innerHTML = `
      <span style="color: ${outcome.failedCount === 0 ? '#10B981' : '#EF4444'};">
        ${outcome.passedCount} / ${outcome.total} Passed (${outcome.failedCount} Failed)
      </span>
    `;
  };

  backdrop.querySelector('#test-rerun-btn').addEventListener('click', runTests);
  runTests();
}
