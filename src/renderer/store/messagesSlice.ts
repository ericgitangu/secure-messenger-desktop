import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MESSAGES_PAGE_SIZE, SEARCH_RESULTS_LIMIT } from '@shared/constants';
import { bridge } from '../api/bridge';
import type { Message } from '../types/models';

interface MessagesState {
  items: Message[];
  loading: boolean;
  hasOlder: boolean;
  searchResults: Message[];
  searchQuery: string;
  searching: boolean;
}

const initialState: MessagesState = {
  items: [],
  loading: false,
  hasOlder: true,
  searchResults: [],
  searchQuery: '',
  searching: false,
};

export const fetchMessages = createAsyncThunk('messages/fetch', async (chatId: string) => {
  const messages = await bridge().getMessages(chatId, Date.now() + 1, MESSAGES_PAGE_SIZE);
  return messages;
});

export const loadOlderMessages = createAsyncThunk(
  'messages/loadOlder',
  async (chatId: string, { getState }) => {
    const state = getState() as { messages: MessagesState };
    const oldest = state.messages.items[0];
    const beforeTs = oldest ? oldest.ts : Date.now() + 1;
    const messages = await bridge().getMessages(chatId, beforeTs, MESSAGES_PAGE_SIZE);
    return messages;
  },
);

export const searchMessages = createAsyncThunk(
  'messages/search',
  async ({ chatId, query }: { chatId: string | null; query: string }) => {
    const results = await bridge().searchMessages(chatId, query, SEARCH_RESULTS_LIMIT);
    return { results, query };
  },
);

export const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<Message>) {
      state.items.push(action.payload);
    },
    clearMessages(state) {
      state.items = [];
      state.hasOlder = true;
    },
    clearSearch(state) {
      state.searchResults = [];
      state.searchQuery = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        // Messages come DESC, reverse for chronological display
        state.items = [...action.payload].reverse();
        state.hasOlder = action.payload.length === MESSAGES_PAGE_SIZE;
        state.loading = false;
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.loading = false;
      })
      .addCase(loadOlderMessages.fulfilled, (state, action) => {
        // Prepend older messages (they come DESC, so reverse)
        const older = [...action.payload].reverse();
        state.items = [...older, ...state.items];
        state.hasOlder = action.payload.length === MESSAGES_PAGE_SIZE;
      })
      .addCase(searchMessages.pending, (state) => {
        state.searching = true;
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.searchResults = action.payload.results;
        state.searchQuery = action.payload.query;
        state.searching = false;
      })
      .addCase(searchMessages.rejected, (state) => {
        state.searching = false;
      });
  },
});

export const { addMessage, clearMessages, clearSearch } = messagesSlice.actions;
export default messagesSlice.reducer;
