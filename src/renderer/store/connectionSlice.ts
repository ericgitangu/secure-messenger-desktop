import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ConnectionState } from '../../shared/constants';

interface ConnectionSliceState {
  state: ConnectionState;
  lastConnectedAt: number | null;
  reconnectAttempts: number;
}

const initialState: ConnectionSliceState = {
  state: 'offline',
  lastConnectedAt: null,
  reconnectAttempts: 0,
};

export const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnected(state) {
      state.state = 'connected';
      state.lastConnectedAt = Date.now();
      state.reconnectAttempts = 0;
    },
    setReconnecting(state) {
      state.state = 'reconnecting';
      state.reconnectAttempts += 1;
    },
    setOffline(state) {
      state.state = 'offline';
    },
    setConnectionState(state, action: PayloadAction<ConnectionState>) {
      const newState = action.payload;
      if (newState === 'connected') {
        state.state = 'connected';
        state.lastConnectedAt = Date.now();
        state.reconnectAttempts = 0;
      } else if (newState === 'reconnecting') {
        state.state = 'reconnecting';
        state.reconnectAttempts += 1;
      } else {
        state.state = 'offline';
      }
    },
  },
});

export const { setConnected, setReconnecting, setOffline, setConnectionState } = connectionSlice.actions;
export default connectionSlice.reducer;
