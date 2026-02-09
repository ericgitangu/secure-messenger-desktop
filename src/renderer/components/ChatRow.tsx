import { CSSProperties, memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import { MessageCircle } from 'lucide-react';
import type { Chat } from '../types/models';

interface ChatRowProps {
  chat: Chat;
  selected: boolean;
  onClick: (chatId: string) => void;
  style: CSSProperties;
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const ChatRow = memo(function ChatRow({ chat, selected, onClick, style }: ChatRowProps) {
  return (
    <Box
      onClick={() => onClick(chat.id)}
      sx={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        cursor: 'pointer',
        bgcolor: selected ? 'action.selected' : 'transparent',
        '&:hover': {
          bgcolor: selected ? 'action.selected' : 'action.hover',
        },
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.15s ease',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <MessageCircle size={20} color="white" />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: chat.unreadCount > 0 ? 700 : 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {chat.title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              flexShrink: 0,
              ml: 1,
            }}
          >
            {formatTime(chat.lastMessageAt)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Tap to view messages
          </Typography>
          {chat.unreadCount > 0 && (
            <Badge
              badgeContent={chat.unreadCount}
              color="primary"
              max={99}
              sx={{ ml: 1 }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
});
