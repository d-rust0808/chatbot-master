---
alwaysApply: true
---

# Browser Automation & Platform Integration

## Browser Automation Principles

### Anti-Detection Strategy
- **MUST**: Use `puppeteer-extra` với `puppeteer-extra-plugin-stealth`
- **MUST**: Implement human-like behavior patterns
- **MUST**: Rotate user agents và fingerprints
- **MUST**: Add random delays (1-5 seconds)
- **MUST**: Simulate mouse movements và typing patterns

### Browser Manager Pattern
- **Singleton**: One BrowserManager instance per platform
- **Session Pool**: Manage multiple browser sessions
- **Resource Cleanup**: Always close browsers và pages properly
- **Error Recovery**: Auto-restart on crashes

```typescript
class BrowserManager {
  private browsers: Map<string, Browser> = new Map();
  
  async getBrowser(platform: string): Promise<Browser> {
    if (!this.browsers.has(platform)) {
      const browser = await this.createBrowser(platform);
      this.browsers.set(platform, browser);
    }
    return this.browsers.get(platform)!;
  }
  
  private async createBrowser(platform: string): Promise<Browser> {
    return puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }
}
```

## Platform Adapter Pattern

### Interface Contract
- **MUST**: Tất cả adapters implement `PlatformAdapter` interface
- **MUST**: Handle connection, disconnection, send/receive
- **MUST**: Emit events cho message received, connection status
- **MUST**: Implement error handling và retry logic

```typescript
interface PlatformAdapter {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  getStatus(): Promise<ConnectionStatus>;
  
  // Message operations
  sendMessage(chatId: string, message: string, options?: SendOptions): Promise<void>;
  onMessage(callback: (message: IncomingMessage) => void): void;
  
  // Chat operations
  getChats(): Promise<Chat[]>;
  getChatHistory(chatId: string, limit?: number): Promise<Message[]>;
  
  // Media support
  sendMedia?(chatId: string, media: MediaFile, caption?: string): Promise<void>;
}
```

### Adapter Implementation Rules
1. **Error Handling**: 
   - Catch và wrap platform-specific errors
   - Provide meaningful error messages
   - Log errors với context

2. **Retry Logic**:
   - Implement exponential backoff
   - Max retry attempts (3-5)
   - Different strategies cho different error types

3. **Rate Limiting**:
   - Respect platform rate limits
   - Implement queue system cho messages
   - Track và enforce limits

4. **Session Management**:
   - Save session data (cookies, localStorage)
   - Restore sessions on restart
   - Handle session expiration

```typescript
class WhatsAppAdapter implements PlatformAdapter {
  private client: Client;
  private sessionData?: SessionData;
  
  async connect(): Promise<void> {
    try {
      this.client = new Client({
        session: this.sessionData,
        puppeteer: {
          headless: true,
          args: ['--no-sandbox'],
        },
      });
      
      // Event handlers
      this.client.on('qr', (qr) => this.emit('qr', qr));
      this.client.on('ready', () => this.emit('connected'));
      this.client.on('message', (msg) => this.handleMessage(msg));
      
      await this.client.initialize();
    } catch (error) {
      logger.error('WhatsApp connection failed', { error });
      throw new PlatformConnectionError('whatsapp', error.message, error);
    }
  }
  
  async disconnect(): Promise<void> {
    await this.saveSession();
    await this.client.destroy();
  }
  
  private async saveSession(): Promise<void> {
    const sessionData = await this.client.getState();
    // Save to database
    await this.sessionRepository.save(this.platformId, sessionData);
  }
}
```

## Human-Like Behavior

### Delays
- **Random delays**: 1-5 seconds giữa actions
- **Typing simulation**: 50-100 WPM variation
- **Mouse movements**: Random paths, not straight lines

```typescript
function randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function humanType(page: Page, text: string): Promise<void> {
  for (const char of text) {
    await page.type('input', char, { delay: Math.random() * 100 + 50 });
  }
}
```

### Fingerprint Randomization
- **User-Agent**: Rotate user agents
- **Viewport**: Randomize screen sizes
- **Languages**: Vary Accept-Language headers
- **Timezone**: Match target region

## Session Persistence

### Storage Strategy
- **Database**: Store session data trong `PlatformConnection.sessionData`
- **Encryption**: Encrypt session data trước khi lưu
- **Restoration**: Restore sessions on startup

```typescript
async function restoreSession(platformId: string): Promise<SessionData | null> {
  const connection = await prisma.platformConnection.findUnique({
    where: { id: platformId },
  });
  
  if (!connection?.sessionData) {
    return null;
  }
  
  return decryptSessionData(connection.sessionData as string);
}
```

### Session Lifecycle
1. **Create**: On first connection
2. **Save**: After successful connection, periodically
3. **Restore**: On reconnect
4. **Invalidate**: On logout hoặc expiration

## Error Handling & Recovery

### Error Classification
- **Connection Errors**: Network, timeout, authentication
- **Platform Errors**: Rate limit, banned, API changes
- **Transient Errors**: Temporary failures, retry-able

### Recovery Strategies
```typescript
class PlatformErrorHandler {
  async handleError(error: Error, adapter: PlatformAdapter): Promise<void> {
    if (this.isTransientError(error)) {
      await this.retryWithBackoff(adapter);
    } else if (this.isConnectionError(error)) {
      await adapter.reconnect();
    } else if (this.isRateLimitError(error)) {
      await this.handleRateLimit(adapter);
    } else {
      logger.error('Unrecoverable error', { error });
      await adapter.disconnect();
    }
  }
}
```

### Circuit Breaker Pattern
- **Open**: Too many failures, stop trying
- **Half-Open**: Test connection periodically
- **Closed**: Normal operation

## Platform-Specific Guidelines

### WhatsApp
- **Library**: `whatsapp-web.js`
- **QR Code**: Display QR code cho user scan
- **Session**: Reuse session để tránh re-scan
- **Rate Limits**: ~20 messages/second

### Facebook Messenger
- **Approach**: Custom Puppeteer script (vì API không stable)
- **Login**: Handle 2FA, security checks
- **Navigation**: Navigate to Messenger inbox
- **Rate Limits**: Conservative, ~10 messages/minute

### Instagram
- **Library**: `instagram-private-api` hoặc Puppeteer
- **DMs**: Access Direct Messages
- **Rate Limits**: Very strict, ~5-10 messages/hour

### E-commerce Platforms (Shopee, Lazada)
- **Approach**: Official Seller APIs (preferred)
- **OAuth**: Implement OAuth flow
- **API Keys**: Store securely
- **Rate Limits**: Follow official limits

## Testing Browser Automation

### Mock Strategies
- **Unit Tests**: Mock Puppeteer, test adapter logic
- **Integration Tests**: Use real browser, test flows
- **E2E Tests**: Test full platform integration (staging accounts)

```typescript
// Mock example
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn(),
      type: jest.fn(),
      click: jest.fn(),
    }),
  }),
}));
```
