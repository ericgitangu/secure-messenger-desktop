import { useEffect } from 'react';
import { useAppDispatch } from '../store';
import { setConnectionState } from '../store/connectionSlice';
import { addMessage, clearMessages } from '../store/messagesSlice';
import { updateChatLastMessage, fetchChats, markChatAsRead, selectChat } from '../store/chatsSlice';
import { fetchMessages, loadOlderMessages, searchMessages, clearSearch } from '../store/messagesSlice';
import type { ConnectionState } from '../../shared/constants';
import type { NewMessageEvent } from '../types/models';

export function useIpcListeners() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubConnection = window.electronAPI.onConnectionState((state: ConnectionState) => {
      dispatch(setConnectionState(state));
    });

    const unsubMessage = window.electronAPI.onNewMessage((data: unknown) => {
      const event = data as NewMessageEvent;
      dispatch(addMessage(event.message));
      dispatch(
        updateChatLastMessage({
          chatId: event.chatId,
          ts: event.message.ts,
          incrementUnread: true,
        })
      );
    });

    return () => {
      unsubConnection();
      unsubMessage();
    };
  }, [dispatch]);
}

export function useChatsActions() {
  const dispatch = useAppDispatch();

  return {
    loadChats: () => dispatch(fetchChats()),
    selectChat: (chatId: string) => {
      dispatch(selectChat(chatId));
      dispatch(clearMessages());
      dispatch(clearSearch());
      dispatch(fetchMessages(chatId));
      dispatch(markChatAsRead(chatId));
    },
  };
}

export function useMessagesActions() {
  const dispatch = useAppDispatch();

  return {
    loadOlder: (chatId: string) => dispatch(loadOlderMessages(chatId)),
    search: (chatId: string | null, query: string) =>
      dispatch(searchMessages({ chatId, query })),
    clearSearch: () => dispatch(clearSearch()),
  };
}
