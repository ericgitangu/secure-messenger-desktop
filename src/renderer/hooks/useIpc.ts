import { useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch } from '../store';
import { setConnectionState } from '../store/connectionSlice';
import {
  addMessage,
  clearMessages,
  fetchMessages,
  loadOlderMessages,
  sendNewMessage,
  searchMessages,
  clearSearch,
} from '../store/messagesSlice';
import {
  updateChatLastMessage,
  fetchChats,
  loadMoreChats,
  createNewChat,
  markChatAsRead,
  selectChat,
} from '../store/chatsSlice';
import { bridge } from '../api/bridge';
import type { ConnectionState } from '@shared/constants';
import type { NewMessageEvent } from '../types/models';

export function useIpcListeners(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubConnection = bridge().onConnectionState((state: ConnectionState) => {
      dispatch(setConnectionState(state));
    });

    const unsubMessage = bridge().onNewMessage((data: unknown) => {
      const event = data as NewMessageEvent;
      dispatch(addMessage(event.message));
      dispatch(
        updateChatLastMessage({
          chatId: event.chatId,
          ts: event.message.ts,
          incrementUnread: true,
        }),
      );
    });

    return () => {
      unsubConnection();
      unsubMessage();
    };
  }, [dispatch]);
}

export function useChatsActions(): {
  loadChats: () => void;
  loadMore: () => void;
  createChat: (title: string) => void;
  selectChat: (chatId: string) => void;
} {
  const dispatch = useAppDispatch();

  const loadChats = useCallback(() => {
    void dispatch(fetchChats());
  }, [dispatch]);

  const loadMore = useCallback(() => {
    void dispatch(loadMoreChats());
  }, [dispatch]);

  const doCreateChat = useCallback(
    (title: string) => {
      void dispatch(createNewChat(title));
    },
    [dispatch],
  );

  const doSelectChat = useCallback(
    (chatId: string) => {
      dispatch(selectChat(chatId));
      dispatch(clearMessages());
      dispatch(clearSearch());
      void dispatch(fetchMessages(chatId));
      void dispatch(markChatAsRead(chatId));
    },
    [dispatch],
  );

  return useMemo(
    () => ({ loadChats, loadMore, createChat: doCreateChat, selectChat: doSelectChat }),
    [loadChats, loadMore, doCreateChat, doSelectChat],
  );
}

export function useMessagesActions(): {
  loadOlder: (chatId: string) => void;
  send: (chatId: string, body: string) => void;
  search: (chatId: string | null, query: string) => void;
  clearSearch: () => void;
} {
  const dispatch = useAppDispatch();

  const loadOlder = useCallback(
    (chatId: string) => {
      void dispatch(loadOlderMessages(chatId));
    },
    [dispatch],
  );

  const doSend = useCallback(
    (chatId: string, body: string) => {
      void dispatch(sendNewMessage({ chatId, body })).then((result) => {
        if (sendNewMessage.fulfilled.match(result)) {
          dispatch(
            updateChatLastMessage({ chatId, ts: result.payload.ts, incrementUnread: false }),
          );
        }
      });
    },
    [dispatch],
  );

  const doSearch = useCallback(
    (chatId: string | null, query: string) => {
      void dispatch(searchMessages({ chatId, query }));
    },
    [dispatch],
  );

  const doClearSearch = useCallback(() => {
    dispatch(clearSearch());
  }, [dispatch]);

  return useMemo(
    () => ({ loadOlder, send: doSend, search: doSearch, clearSearch: doClearSearch }),
    [loadOlder, doSend, doSearch, doClearSearch],
  );
}
