import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { SquarePen, X } from 'lucide-react';
import { useAppSelector } from '../store';
import { useChatsActions } from '../hooks/useIpc';
import { ChatRow } from './ChatRow';

export function ChatList(): React.JSX.Element {
  const { items, selectedChatId, loading, hasMore } = useAppSelector((s) => s.chats);
  const { loadChats, loadMore, createChat, selectChat } = useChatsActions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  const handleChatClick = useCallback(
    (chatId: string) => {
      selectChat(chatId);
    },
    [selectChat],
  );

  const handleCreateChat = useCallback(() => {
    const title = newChatTitle.trim();
    if (!title) return;
    createChat(title);
    setNewChatTitle('');
    setShowCompose(false);
  }, [newChatTitle, createChat]);

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            Chats
          </Typography>
          <Tooltip title={showCompose ? 'Cancel' : 'New chat'}>
            <IconButton
              size="small"
              onClick={() => {
                setShowCompose((v) => !v);
                setNewChatTitle('');
              }}
              sx={{ color: 'text.primary' }}
            >
              {showCompose ? <X size={18} /> : <SquarePen size={18} />}
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {chatCountText}
        </Typography>
        {showCompose && (
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Chat name..."
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateChat();
              }
            }}
            sx={{ mt: 1 }}
          />
        )}
      </Box>

      <Box ref={scrollRef} onScroll={handleScroll} sx={{ flex: 1, overflow: 'auto' }}>
        {items.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            selected={chat.id === selectedChatId}
            onClick={handleChatClick}
            style={{}}
          />
        ))}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
