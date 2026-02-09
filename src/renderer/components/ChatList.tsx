import { useCallback, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useAppSelector } from '../store';
import { useChatsActions } from '../hooks/useIpc';
import { ChatRow } from './ChatRow';

export function ChatList(): React.JSX.Element {
  const { items, selectedChatId, loading } = useAppSelector((s) => s.chats);
  const { loadChats, selectChat } = useChatsActions();

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const handleChatClick = useCallback(
    (chatId: string) => {
      selectChat(chatId);
    },
    [selectChat],
  );

  const chatCountText = useMemo(
    () => `${items.length} conversation${items.length !== 1 ? 's' : ''}`,
    [items.length],
  );

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Chats
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {chatCountText}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {items.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            selected={chat.id === selectedChatId}
            onClick={handleChatClick}
            style={{}}
          />
        ))}
      </Box>
    </Box>
  );
}
