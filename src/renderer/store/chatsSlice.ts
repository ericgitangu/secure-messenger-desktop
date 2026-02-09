import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Chat } from '../types/models';
import { CHATS_PAGE_SIZE } from '../../shared/constants';

interface ChatsState {
  items: Chat[];
  selectedChatId: string | null;
  loading: boolean;
  hasMore: boolean;
  offset: number;
}

const initialState: ChatsState = {
  items: [],
  selectedChatId: null,
  loading: false,
  hasMore: true,
  offset: 0,
};

export const fetchChats = createAsyncThunk(
  'chats/fetch',
  async (_, { getState }) => {
    const state = getState() as { chats: ChatsState };
    const chats = await window.electronAPI.getChats(state.chats.offset, CHATS_PAGE_SIZE);
    return chats;
  }
);

export const loadMoreChats = createAsyncThunk(
  'chats/loadMore',
  async (_, { getState }) => {
    const state = getState() as { chats: ChatsState };
    const chats = await window.electronAPI.getChats(state.chats.offset, CHATS_PAGE_SIZE);
    return chats;
  }
);

export const markChatAsRead = createAsyncThunk(
  'chats/markRead',
  async (chatId: string) => {
    await window.electronAPI.markChatRead(chatId);
    return chatId;
  }
);

export const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    selectChat(state, action: PayloadAction<string>) {
      state.selectedChatId = action.payload;
    },
    updateChatLastMessage(
      state,
      action: PayloadAction<{ chatId: string; ts: number; incrementUnread: boolean }>
    ) {
      const { chatId, ts, incrementUnread } = action.payload;
      const chat = state.items.find((c) => c.id === chatId);
      if (chat) {
        chat.lastMessageAt = ts;
        if (incrementUnread && chatId !== state.selectedChatId) {
          chat.unreadCount += 1;
        }
        // Re-sort by lastMessageAt
        state.items.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      }
    },
    resetChats(state) {
      state.items = [];
      state.offset = 0;
      state.hasMore = true;
      state.selectedChatId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.items = action.payload;
        state.offset = action.payload.length;
        state.hasMore = action.payload.length === CHATS_PAGE_SIZE;
        state.loading = false;
      })
      .addCase(fetchChats.rejected, (state) => {
        state.loading = false;
      })
      .addCase(loadMoreChats.fulfilled, (state, action) => {
        state.items = [...state.items, ...action.payload];
        state.offset += action.payload.length;
        state.hasMore = action.payload.length === CHATS_PAGE_SIZE;
      })
      .addCase(markChatAsRead.fulfilled, (state, action) => {
        const chat = state.items.find((c) => c.id === action.payload);
        if (chat) {
          chat.unreadCount = 0;
        }
      });
  },
});

export const { selectChat, updateChatLastMessage, resetChats } = chatsSlice.actions;
export default chatsSlice.reducer;
