import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useAppSelector } from '../store';
import { useChatsActions } from '../hooks/useIpc';
import { ChatRow } from './ChatRow';

const CHAT_ROW_HEIGHT = 72;
const OVERSCAN_COUNT = 10;

export function ChatList() {
  const { items, selectedChatId, loading } = useAppSelector((s) => s.chats);
  const { loadChats, selectChat } = useChatsActions();
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleChatClick = useCallback(
    (chatId: string) => {
      selectChat(chatId);
    },
    [selectChat],
  );

  // Memoize chat count text to avoid re-renders
  const chatCountText = useMemo(
    () => `${items.length} conversation${items.length !== 1 ? 's' : ''}`,
    [items.length],
  );

  // Calculate list height dynamically
  const listHeight = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight - 120;
    }
    return 600;
  }, []);

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box ref={containerRef} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Chats
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {chatCountText}
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }}>
        <List
          ref={listRef}
          height={listHeight}
          width="100%"
          itemCount={items.length}
          itemSize={CHAT_ROW_HEIGHT}
          overscanCount={OVERSCAN_COUNT}
        >
          {({ index, style }) => {
            const chat = items[index];
            return (
              <ChatRow
                key={chat.id}
                chat={chat}
                selected={chat.id === selectedChatId}
                onClick={handleChatClick}
                style={style}
              />
            );
          }}
        </List>
      </Box>
    </Box>
  );
}
