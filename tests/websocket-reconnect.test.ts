/**
 * WebSocket Reconnection Tests
 * Tests for WebSocket connection management and reconnection logic
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

describe('WebSocket Reconnection', () => {
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 5;
  let reconnectDelay = 1000;

  beforeEach(() => {
    reconnectAttempts = 0;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should reconnect on connection close', () => {
    let ws: MockWebSocket | null = null;
    let reconnected = false;

    const connect = () => {
      ws = new MockWebSocket('ws://localhost:3000');
      
      ws.onclose = () => {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(() => {
            reconnected = true;
            connect();
          }, reconnectDelay);
        }
      };
    };

    connect();
    
    // Simulate connection close
    ws?.close();
    
    // Fast-forward time
    jest.advanceTimersByTime(reconnectDelay);
    
    expect(reconnected).toBe(true);
    expect(reconnectAttempts).toBeGreaterThan(0);
  });

  it('should stop reconnecting after max attempts', () => {
    let ws: MockWebSocket | null = null;
    let stoppedReconnecting = false;

    const connect = () => {
      ws = new MockWebSocket('ws://localhost:3000');
      
      ws.onclose = () => {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          stoppedReconnecting = true;
        }
      };
    };

    connect();
    
    // Simulate multiple connection failures
    for (let i = 0; i < maxReconnectAttempts + 1; i++) {
      ws?.close();
      jest.advanceTimersByTime(reconnectDelay);
    }
    
    expect(stoppedReconnecting).toBe(true);
    expect(reconnectAttempts).toBe(maxReconnectAttempts);
  });

  it('should use exponential backoff for reconnection', () => {
    const delays: number[] = [];
    let ws: MockWebSocket | null = null;
    let attempt = 0;

    const connect = () => {
      ws = new MockWebSocket('ws://localhost:3000');
      
      ws.onclose = () => {
        if (attempt < maxReconnectAttempts) {
          const delay = Math.min(reconnectDelay * Math.pow(2, attempt), 30000);
          delays.push(delay);
          attempt++;
          setTimeout(() => {
            connect();
          }, delay);
        }
      };
    };

    connect();
    
    // Simulate connection failures
    for (let i = 0; i < 3; i++) {
      ws?.close();
      jest.advanceTimersByTime(delays[i] || reconnectDelay);
    }
    
    // Verify exponential backoff
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
  });

  it('should send heartbeat to keep connection alive', () => {
    let ws: MockWebSocket | null = null;
    const messages: string[] = [];
    const heartbeatInterval = 30000;

    const connect = () => {
      ws = new MockWebSocket('ws://localhost:3000');
      
      ws.send = (data: string) => {
        messages.push(data);
      };
    };

    connect();
    
    // Simulate heartbeat
    const heartbeat = setInterval(() => {
      if (ws?.readyState === MockWebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);

    jest.advanceTimersByTime(heartbeatInterval * 2);
    
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some(m => JSON.parse(m).type === 'ping')).toBe(true);
    
    clearInterval(heartbeat);
  });

  it('should handle reconnection during message send', () => {
    let ws: MockWebSocket | null = null;
    const queuedMessages: string[] = [];

    const connect = () => {
      ws = new MockWebSocket('ws://localhost:3000');
      
      ws.onopen = () => {
        // Send queued messages
        queuedMessages.forEach(msg => {
          ws?.send(msg);
        });
        queuedMessages.length = 0;
      };
    };

    const sendMessage = (message: string) => {
      if (ws?.readyState === MockWebSocket.OPEN) {
        ws.send(message);
      } else {
        queuedMessages.push(message);
        if (ws?.readyState === MockWebSocket.CLOSED) {
          connect();
        }
      }
    };

    connect();
    
    // Close connection
    ws?.close();
    
    // Try to send message while disconnected
    sendMessage('test message');
    
    // Reconnect
    jest.advanceTimersByTime(reconnectDelay);
    
    // Message should be sent after reconnection
    expect(queuedMessages.length).toBe(0);
  });

  it('should handle network errors gracefully', () => {
    let ws: MockWebSocket | null = null;
    let errorHandled = false;

    const connect = () => {
      ws = new MockWebSocket('ws://localhost:3000');
      
      ws.onerror = () => {
        errorHandled = true;
        // Attempt reconnection
        setTimeout(() => {
          connect();
        }, reconnectDelay);
      };
    };

    connect();
    
    // Simulate error
    if (ws?.onerror) {
      ws.onerror(new Event('error'));
    }
    
    jest.advanceTimersByTime(reconnectDelay);
    
    expect(errorHandled).toBe(true);
  });
});

