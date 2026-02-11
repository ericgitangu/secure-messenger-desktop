import { CSSProperties, memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import type { Chat } from '../types/models';

interface ChatRowProps {
  chat: Chat;
  selected: boolean;
  onClick: (chatId: string) => void;
  style: CSSProperties;
}

const AVATAR_COLORS = [
  '#E53935',
  '#D81B60',
  '#8E24AA',
  '#5E35B1',
  '#3949AB',
  '#1E88E5',
  '#039BE5',
  '#00ACC1',
  '#00897B',
  '#43A047',
  '#7CB342',
  '#C0CA33',
  '#F4511E',
  '#6D4C41',
  '#546E7A',
  '#FB8C00',
  '#FFB300',
  '#00BFA5',
  '#304FFE',
  '#C51162',
];

function getInitials(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
}

function getColorFromInitials(initials: string): string {
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

const Avatar = memo(function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        bgcolor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {initials}
      </Typography>
    </Box>
  );
});

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
      <Avatar
        initials={getInitials(chat.title)}
        color={getColorFromInitials(getInitials(chat.title))}
      />

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

        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}
        >
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
            <Badge badgeContent={chat.unreadCount} color="primary" max={99} sx={{ ml: 1 }} />
          )}
        </Box>
      </Box>
    </Box>
  );
});
