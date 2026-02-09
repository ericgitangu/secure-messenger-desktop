import { describe, it, expect } from 'vitest';
import connectionReducer, {
  setConnected,
  setReconnecting,
  setOffline,
  setConnectionState,
} from '@renderer/store/connectionSlice';

describe('connectionSlice', () => {
  const initialState = {
    state: 'offline' as const,
    lastConnectedAt: null,
    reconnectAttempts: 0,
  };

  it('should return the initial state', () => {
    expect(connectionReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('setConnected', () => {
    it('should set state to connected and reset attempts', () => {
      const prev = { state: 'reconnecting' as const, lastConnectedAt: null, reconnectAttempts: 3 };
      const next = connectionReducer(prev, setConnected());
      expect(next.state).toBe('connected');
      expect(next.reconnectAttempts).toBe(0);
      expect(next.lastConnectedAt).toBeGreaterThan(0);
    });
  });

  describe('setReconnecting', () => {
    it('should set state to reconnecting and increment attempts', () => {
      const prev = {
        state: 'connected' as const,
        lastConnectedAt: Date.now(),
        reconnectAttempts: 0,
      };
      const next = connectionReducer(prev, setReconnecting());
      expect(next.state).toBe('reconnecting');
      expect(next.reconnectAttempts).toBe(1);
    });

    it('should increment attempts on each call', () => {
      const init = {
        state: 'connected' as const,
        lastConnectedAt: Date.now(),
        reconnectAttempts: 0,
      };
      let state = connectionReducer(init, setReconnecting());
      state = connectionReducer(state, setReconnecting());
      state = connectionReducer(state, setReconnecting());
      expect(state.reconnectAttempts).toBe(3);
    });
  });

  describe('setOffline', () => {
    it('should set state to offline', () => {
      const prev = {
        state: 'reconnecting' as const,
        lastConnectedAt: Date.now(),
        reconnectAttempts: 5,
      };
      const next = connectionReducer(prev, setOffline());
      expect(next.state).toBe('offline');
    });
  });

  describe('setConnectionState', () => {
    it('should handle connected transition', () => {
      const next = connectionReducer(initialState, setConnectionState('connected'));
      expect(next.state).toBe('connected');
      expect(next.reconnectAttempts).toBe(0);
      expect(next.lastConnectedAt).toBeGreaterThan(0);
    });

    it('should handle reconnecting transition', () => {
      const next = connectionReducer(initialState, setConnectionState('reconnecting'));
      expect(next.state).toBe('reconnecting');
      expect(next.reconnectAttempts).toBe(1);
    });

    it('should handle offline transition', () => {
      const connected = {
        state: 'connected' as const,
        lastConnectedAt: Date.now(),
        reconnectAttempts: 0,
      };
      const next = connectionReducer(connected, setConnectionState('offline'));
      expect(next.state).toBe('offline');
    });
  });

  describe('state machine transitions', () => {
    it('connected -> reconnecting -> connected', () => {
      let state = connectionReducer(initialState, setConnected());
      expect(state.state).toBe('connected');

      state = connectionReducer(state, setReconnecting());
      expect(state.state).toBe('reconnecting');
      expect(state.reconnectAttempts).toBe(1);

      state = connectionReducer(state, setConnected());
      expect(state.state).toBe('connected');
      expect(state.reconnectAttempts).toBe(0);
    });

    it('connected -> reconnecting -> offline -> connected', () => {
      let state = connectionReducer(initialState, setConnected());
      state = connectionReducer(state, setReconnecting());
      state = connectionReducer(state, setReconnecting());
      state = connectionReducer(state, setReconnecting());
      expect(state.reconnectAttempts).toBe(3);

      state = connectionReducer(state, setOffline());
      expect(state.state).toBe('offline');

      state = connectionReducer(state, setConnected());
      expect(state.state).toBe('connected');
      expect(state.reconnectAttempts).toBe(0);
    });
  });
});
