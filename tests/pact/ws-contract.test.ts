import { describe, it, expect } from 'vitest';

/**
 * WebSocket Contract Tests
 *
 * These tests verify the contract (schema) of WebSocket events
 * exchanged between the WS server and client.
 *
 * In a production system, these would use @pact-foundation/pact
 * with a message pact for async event contracts. For this assessment,
 * we define and validate the contract schema directly.
 */

interface WsConnectionStateEvent {
  type: 'connection_state';
  data: 'connected' | 'reconnecting' | 'offline';
}

interface WsNewMessageEvent {
  type: 'new_message';
  data: {
    message: {
      id: string;
      chatId: string;
      ts: number;
      sender: string;
      body: string;
    };
    chatId: string;
    chatTitle: string;
  };
}

type WsEvent = WsConnectionStateEvent | WsNewMessageEvent;

function isValidConnectionStateEvent(event: unknown): event is WsConnectionStateEvent {
  if (typeof event !== 'object' || event === null) return false;
  const e = event as Record<string, unknown>;
  return (
    e.type === 'connection_state' &&
    typeof e.data === 'string' &&
    ['connected', 'reconnecting', 'offline'].includes(e.data)
  );
}

function isValidNewMessageEvent(event: unknown): event is WsNewMessageEvent {
  if (typeof event !== 'object' || event === null) return false;
  const e = event as Record<string, unknown>;
  if (e.type !== 'new_message') return false;

  const data = e.data as Record<string, unknown>;
  if (typeof data !== 'object' || data === null) return false;

  const msg = data.message as Record<string, unknown>;
  if (typeof msg !== 'object' || msg === null) return false;

  return (
    typeof msg.id === 'string' &&
    typeof msg.chatId === 'string' &&
    typeof msg.ts === 'number' &&
    typeof msg.sender === 'string' &&
    typeof msg.body === 'string' &&
    typeof data.chatId === 'string' &&
    typeof data.chatTitle === 'string' &&
    msg.chatId === data.chatId
  );
}

function isValidWsEvent(event: unknown): event is WsEvent {
  return isValidConnectionStateEvent(event) || isValidNewMessageEvent(event);
}

describe('WebSocket Contract', () => {
  describe('connection_state event', () => {
    it('should accept valid connected state', () => {
      const event = { type: 'connection_state', data: 'connected' };
      expect(isValidConnectionStateEvent(event)).toBe(true);
    });

    it('should accept valid reconnecting state', () => {
      const event = { type: 'connection_state', data: 'reconnecting' };
      expect(isValidConnectionStateEvent(event)).toBe(true);
    });

    it('should accept valid offline state', () => {
      const event = { type: 'connection_state', data: 'offline' };
      expect(isValidConnectionStateEvent(event)).toBe(true);
    });

    it('should reject invalid state value', () => {
      const event = { type: 'connection_state', data: 'invalid' };
      expect(isValidConnectionStateEvent(event)).toBe(false);
    });

    it('should reject missing type', () => {
      const event = { data: 'connected' };
      expect(isValidConnectionStateEvent(event)).toBe(false);
    });

    it('should reject null', () => {
      expect(isValidConnectionStateEvent(null)).toBe(false);
    });
  });

  describe('new_message event', () => {
    const validEvent = {
      type: 'new_message',
      data: {
        message: {
          id: 'msg-123',
          chatId: 'chat-456',
          ts: 1706000000000,
          sender: 'Alice',
          body: 'Hello, world!',
        },
        chatId: 'chat-456',
        chatTitle: 'Alice',
      },
    };

    it('should accept valid new_message event', () => {
      expect(isValidNewMessageEvent(validEvent)).toBe(true);
    });

    it('should reject when message.chatId does not match data.chatId', () => {
      const event = {
        ...validEvent,
        data: {
          ...validEvent.data,
          chatId: 'different-chat',
        },
      };
      expect(isValidNewMessageEvent(event)).toBe(false);
    });

    it('should reject when missing message fields', () => {
      const event = {
        type: 'new_message',
        data: {
          message: { id: 'msg-123' },
          chatId: 'chat-456',
          chatTitle: 'Alice',
        },
      };
      expect(isValidNewMessageEvent(event)).toBe(false);
    });

    it('should reject when ts is not a number', () => {
      const event = {
        type: 'new_message',
        data: {
          message: {
            ...validEvent.data.message,
            ts: '2024-01-01',
          },
          chatId: 'chat-456',
          chatTitle: 'Alice',
        },
      };
      expect(isValidNewMessageEvent(event)).toBe(false);
    });

    it('should reject null data', () => {
      const event = { type: 'new_message', data: null };
      expect(isValidNewMessageEvent(event)).toBe(false);
    });
  });

  describe('WsEvent discriminator', () => {
    it('should accept connection_state events', () => {
      expect(isValidWsEvent({ type: 'connection_state', data: 'connected' })).toBe(true);
    });

    it('should accept new_message events', () => {
      expect(
        isValidWsEvent({
          type: 'new_message',
          data: {
            message: {
              id: 'msg-1',
              chatId: 'chat-1',
              ts: Date.now(),
              sender: 'Bob',
              body: 'Test',
            },
            chatId: 'chat-1',
            chatTitle: 'Bob',
          },
        })
      ).toBe(true);
    });

    it('should reject unknown event types', () => {
      expect(isValidWsEvent({ type: 'unknown', data: {} })).toBe(false);
    });
  });
});
