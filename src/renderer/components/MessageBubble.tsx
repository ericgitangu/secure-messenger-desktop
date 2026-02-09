import { memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Shield } from 'lucide-react';
import type { Message } from '../types/models';

interface MessageBubbleProps {
  message: Message;
  isHighlighted?: boolean;
}

const senderColors = [
  '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#4f46e5', '#c026d3', '#65a30d', '#ea580c',
];

function getSenderColor(sender: string): string {
  let hash = 0;
  for (let i = 0; i < sender.length; i++) {
    hash = sender.charCodeAt(i) + ((hash << 5) - hash);
  }
  return senderColors[Math.abs(hash) % senderColors.length];
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const MessageBubble = memo(function MessageBubble({ message, isHighlighted }: MessageBubbleProps) {
  const color = getSenderColor(message.sender);

  return (
    <Box
      sx={{
        px: 2,
        py: 0.75,
        ...(isHighlighted && {
          bgcolor: 'action.selected',
          borderRadius: 1,
        }),
      }}
    >
      <Box sx={{ maxWidth: '75%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color,
              fontSize: '0.8rem',
            }}
          >
            {message.sender}
          </Typography>
          <Shield size={12} style={{ color, opacity: 0.6 }} />
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
          >
            {formatTimestamp(message.ts)}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            px: 1.5,
            py: 1,
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            {message.body}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
});
