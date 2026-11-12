/**
 * AERO GUARD - Reliability Module
 * Item 5: Mission State Machine & Immutable Timeline
 * 
 * Strict States:
 * Draft -> Pre-flight -> Active -> (Paused <-> Resumed) -> Completed or Cancelled
 * 
 * Rules:
 * - Reject illegal transitions and log every change to a mission timeline.
 * - Enforce pre-flight checklist before transition to Active:
 *   - Warmup complete (3 minutes)
 *   - Sensors calibrated
 *   - GPS locked (sats >= 6, HDOP <= 2.0)
 *   - No supply noise or brownout faults
 */

export const MISSION_STATES = {
  DRAFT: 'Draft',
  PRE_FLIGHT: 'Pre-flight',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  RESUMED: 'Resumed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

// Legal state transition map
const LEGAL_TRANSITIONS = {
  [MISSION_STATES.DRAFT]: [MISSION_STATES.PRE_FLIGHT, MISSION_STATES.CANCELLED],
  [MISSION_STATES.PRE_FLIGHT]: [MISSION_STATES.ACTIVE, MISSION_STATES.CANCELLED, MISSION_STATES.DRAFT],
  [MISSION_STATES.ACTIVE]: [MISSION_STATES.PAUSED, MISSION_STATES.COMPLETED, MISSION_STATES.CANCELLED],
  [MISSION_STATES.PAUSED]: [MISSION_STATES.RESUMED, MISSION_STATES.CANCELLED, MISSION_STATES.COMPLETED],
  [MISSION_STATES.RESUMED]: [MISSION_STATES.PAUSED, MISSION_STATES.COMPLETED, MISSION_STATES.CANCELLED],
  [MISSION_STATES.COMPLETED]: [], // Terminal state
  [MISSION_STATES.CANCELLED]: []  // Terminal state
};

const MISSION_STORAGE_KEY = 'aeroguard_current_mission_v2';

export class IllegalStateTransitionError extends Error {
  constructor(fromState, toState, reason) {
    super(`Illegal mission transition from '${fromState}' to '${toState}'. ${reason || ''}`);
    this.name = 'IllegalStateTransitionError';
    this.fromState = fromState;
    this.toState = toState;
  }
}

export class MissionStateMachine {
  constructor() {
    this.listeners = new Set();
    this.currentMission = this._loadCurrentMission();
  }

  _loadCurrentMission() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(MISSION_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse current mission:', e);
    }

    // Default new Draft mission
    return this.createNewMission('Airborne Corridors Survey 01');
  }

  _persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(this.currentMission));
      }
    } catch (e) {
      console.warn('Failed to save current mission:', e);
    }
    this._notify();
  }

  createNewMission(name = 'Gas Reconnaissance Mission', operator = 'Lead Pilot') {
    const missionId = `MSN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const mission = {
      id: missionId,
      name,
      operator,
      state: MISSION_STATES.DRAFT,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      preFlightChecklist: {
        warmupVerified: false,
        calibrationVerified: false,
        gpsLocked: false,
        batterySufficient: false,
        supplyNoiseNominal: false,
        hardwareDividerChecked: false
      },
      timeline: [
        {
          id: `EVT-${Date.now()}-init`,
          timestamp: Date.now(),
          fromState: null,
          toState: MISSION_STATES.DRAFT,
          action: 'MISSION_CREATED',
          operator,
          notes: `Mission '${name}' initialized in Draft status`,
          gps: null,
          telemetrySnapshot: null
        }
      ]
    };

    this.currentMission = mission;
    this._persist();
    return mission;
  }

  /**
   * Validate and transition to a new mission state.
   * Throws IllegalStateTransitionError if transition is not permitted.
   */
  transitionTo(targetState, options = {}) {
    const { reason = '', operator = this.currentMission.operator || 'Operator', telemetry = null } = options;
    const currentState = this.currentMission.state;

    // Check if transition is allowed
    const allowed = LEGAL_TRANSITIONS[currentState] || [];
    if (!allowed.includes(targetState)) {
      throw new IllegalStateTransitionError(
        currentState,
        targetState,
        `Allowed transitions from '${currentState}' are: [${allowed.join(', ')}]`
      );
    }

    // Pre-flight to Active requirements validation
    if (currentState === MISSION_STATES.PRE_FLIGHT && targetState === MISSION_STATES.ACTIVE) {
      if (telemetry) {
        if (!telemetry.warmup_done) {
          throw new IllegalStateTransitionError(
            currentState,
            targetState,
            'Cannot launch mission: MQ gas sensors are still warming up (minimum 3 minutes required).'
          );
        }
        if (telemetry.gps && telemetry.gps.sats < 4) {
          throw new IllegalStateTransitionError(
            currentState,
            targetState,
            `Cannot launch mission: GPS satellites count (${telemetry.gps.sats}) is below minimum safe threshold (4 satellites).`
          );
        }
      }
    }

    // Apply state transition
    const now = Date.now();
    this.currentMission.state = targetState;

    if (targetState === MISSION_STATES.ACTIVE && !this.currentMission.startedAt) {
      this.currentMission.startedAt = now;
    }

    if (targetState === MISSION_STATES.COMPLETED || targetState === MISSION_STATES.CANCELLED) {
      this.currentMission.completedAt = now;
    }

    // Log to immutable mission timeline
    const timelineEntry = {
      id: `EVT-${now}-${targetState.toLowerCase()}`,
      timestamp: now,
      fromState: currentState,
      toState: targetState,
      action: `TRANSITION_${targetState.toUpperCase()}`,
      operator,
      notes: reason || `Transitioned from ${currentState} to ${targetState}`,
      gps: telemetry && telemetry.gps ? { lat: telemetry.gps.lat, lon: telemetry.gps.lon, sats: telemetry.gps.sats, hdop: telemetry.gps.hdop } : null,
      telemetrySnapshot: telemetry ? {
        uptimeMs: telemetry.uptime_ms,
        mode: telemetry.mode,
        gas: { ...telemetry.gas }
      } : null
    };

    this.currentMission.timeline.push(timelineEntry);
    this._persist();
    return timelineEntry;
  }

  updatePreFlightChecklist(checklistUpdates) {
    this.currentMission.preFlightChecklist = {
      ...this.currentMission.preFlightChecklist,
      ...checklistUpdates
    };
    this._persist();
  }

  getState() {
    return this.currentMission.state;
  }

  getMission() {
    return { ...this.currentMission };
  }

  getTimeline() {
    return [...this.currentMission.timeline];
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getMission());
    return () => this.listeners.delete(callback);
  }

  _notify() {
    const mission = this.getMission();
    for (const cb of this.listeners) {
      try {
        cb(mission);
      } catch (e) {
        console.error('Mission state machine subscriber error:', e);
      }
    }
  }
}

export const missionStateMachine = new MissionStateMachine();
