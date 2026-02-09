import { useState, useCallback, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { Search, X } from 'lucide-react';
import { useAppSelector } from '../store';
import { useMessagesActions } from '../hooks/useIpc';
import { useDebounce } from '../hooks/useDebounce';
import { VoiceSearchButton } from './VoiceSearchButton';

const DEBOUNCE_MS = 300;
const MIN_SEARCH_CHARS = 3;

export function MessageSearch(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const selectedChatId = useAppSelector((s) => s.chats.selectedChatId);
  const { searchResults, searching, searchQuery } = useAppSelector((s) => s.messages);
  const { search, clearSearch } = useMessagesActions();

  // Auto-search when debounced query changes and meets minimum length
  useEffect(() => {
    if (debouncedQuery.trim().length >= MIN_SEARCH_CHARS) {
      void search(selectedChatId, debouncedQuery.trim());
    } else if (debouncedQuery.trim().length === 0 && searchQuery) {
      clearSearch();
    }
  }, [debouncedQuery, selectedChatId, search, clearSearch, searchQuery]);

  const handleClear = useCallback(() => {
    setQuery('');
    clearSearch();
  }, [clearSearch]);

  const handleVoiceResult = useCallback((transcript: string) => {
    setQuery(transcript);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const statusText = useMemo(() => {
    if (searching) return 'Searching...';
    if (searchQuery) return `${searchResults.length} results`;
    if (query.length > 0 && query.length < MIN_SEARCH_CHARS) {
      return `Type ${MIN_SEARCH_CHARS - query.length} more`;
    }
    return null;
  }, [searching, searchQuery, searchResults.length, query.length]);

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Search messages (3+ chars)..."
          value={query}
          onChange={handleChange}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClear}>
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <VoiceSearchButton onResult={handleVoiceResult} />
        {statusText && (
          <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {statusText}
          </Typography>
        )}
      </Box>
      {searching && <LinearProgress sx={{ mt: 0.5, borderRadius: 1, height: 2 }} />}
    </Box>
  );
}
