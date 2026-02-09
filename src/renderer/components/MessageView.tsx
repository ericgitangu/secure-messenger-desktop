import { useCallback, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { ChevronUp } from 'lucide-react';
import { useAppSelector } from '../store';
import { useMessagesActions } from '../hooks/useIpc';
import { MessageBubble } from './MessageBubble';
import { MessageSearch } from './MessageSearch';
import type { Message } from '../types/models';

function MessageItemContent(_index: number, message: Message) {
  return <MessageBubble key={message.id} message={message} isHighlighted={false} />;
}

function SearchItemContent(_index: number, message: Message) {
  return <MessageBubble key={message.id} message={message} isHighlighted />;
}

export function MessageView() {
  const { items, loading, hasOlder, searchResults, searchQuery } = useAppSelector(
    (s) => s.messages,
  );
  const selectedChatId = useAppSelector((s) => s.chats.selectedChatId);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { loadOlder } = useMessagesActions();

  const handleStartReached = useCallback(() => {
    if (selectedChatId && hasOlder && !loading) {
      loadOlder(selectedChatId);
    }
  }, [selectedChatId, hasOlder, loading, loadOlder]);

  if (!selectedChatId) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          gap: 1,
        }}
      >
        <Typography variant="h6">Select a chat to start</Typography>
        <Typography variant="body2">Choose a conversation from the sidebar</Typography>
      </Box>
    );
  }

  const displayItems = searchQuery ? searchResults : items;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <MessageSearch />

      {loading && items.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box sx={{ flex: 1 }}>
          {hasOlder && !searchQuery && (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Button
                size="small"
                startIcon={<ChevronUp size={16} />}
                onClick={handleStartReached}
                disabled={loading}
              >
                Load older messages
              </Button>
            </Box>
          )}

          <Virtuoso
            ref={virtuosoRef}
            data={displayItems}
            followOutput="smooth"
            startReached={handleStartReached}
            itemContent={searchQuery ? SearchItemContent : MessageItemContent}
            style={{ height: 'calc(100vh - 180px)' }}
          />
        </Box>
      )}
    </Box>
  );
}
