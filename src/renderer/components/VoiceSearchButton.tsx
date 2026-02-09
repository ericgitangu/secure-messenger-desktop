import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VoiceSearchButtonProps {
  onResult: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceSearchButton({
  onResult,
  disabled = false,
}: VoiceSearchButtonProps): React.JSX.Element {
  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    language: 'en-US',
    onResult,
  });

  if (!isSupported) {
    return (
      <Tooltip title="Voice search not supported">
        <span>
          <IconButton size="small" disabled>
            <MicOff size={18} />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={isListening ? 'Stop listening' : 'Voice search'}>
      <IconButton
        size="small"
        disabled={disabled}
        onClick={isListening ? stopListening : startListening}
        color={isListening ? 'error' : 'default'}
        sx={{
          ...(isListening && {
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          }),
        }}
      >
        {isListening ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
      </IconButton>
    </Tooltip>
  );
}
