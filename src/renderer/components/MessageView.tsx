import { useCallback, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { ChevronUp, Send } from 'lucide-react';
import { useAppSelector } from '../store';
import { useMessagesActions } from '../hooks/useIpc';
import { MessageBubble } from './MessageBubble';
import { MessageSearch } from './MessageSearch';
import type { Message } from '../types/models';

function MessageItemContent(_index: number, message: Message): React.JSX.Element {
  return <MessageBubble key={message.id} message={message} isHighlighted={false} />;
}

function SearchItemContent(_index: number, message: Message): React.JSX.Element {
  return <MessageBubble key={message.id} message={message} isHighlighted />;
}

export function MessageView(): React.JSX.Element {
  const { items, loading, hasOlder, searchResults, searchQuery } = useAppSelector(
    (s) => s.messages,
  );
  const selectedChatId = useAppSelector((s) => s.chats.selectedChatId);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { loadOlder, send } = useMessagesActions();
  const [draft, setDraft] = useState('');

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || !selectedChatId) return;
    send(selectedChatId, text);
    setDraft('');
  }, [draft, selectedChatId, send]);

  const handleStartReached = useCallback(() => {
    if (selectedChatId && hasOlder && !loading) {
      void loadOlder(selectedChatId);
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
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {hasOlder && !searchQuery && (
            <Box sx={{ textAlign: 'center', py: 1, flexShrink: 0 }}>
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
            style={{ flex: 1, minHeight: 0 }}
          />
        </Box>
      )}

      {/* Message input — pinned at bottom */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!draft.trim()}
          color="primary"
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' },
            '&:disabled': { bgcolor: 'action.disabledBackground' },
          }}
        >
          <Send size={18} />
        </IconButton>
      </Box>
    </Box>
  );
}
