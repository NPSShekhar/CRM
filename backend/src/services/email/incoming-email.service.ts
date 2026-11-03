import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/index.js';
import { prisma } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { EmailService } from '../email.service.js';

interface ImapIntegrationConfig {
  lastProcessedUid: number;
  initialBaselineUid: number;
  initializedAt: string;
  updatedAt: string;
}

export class IncomingEmailService {
  private static client: ImapFlow | null = null;
  private static mailboxLock: any = null;
  private static isListening: boolean = false;
  private static isProcessing: boolean = false;
  private static watchdogTimer: NodeJS.Timeout | null = null;
  private static reconnectTimer: NodeJS.Timeout | null = null;
  private static reconnectAttempts: number = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = 15;
  private static readonly WATCHDOG_INTERVAL_MS = 60000; // 60s fallback sync

  /**
   * Initializes a new ImapFlow client with sanitized logging and TLS
   */
  private static createClient(): ImapFlow {
    return new ImapFlow({
      host: config.imap.host,
      port: config.imap.port,
      secure: config.imap.tls,
      auth: {
        user: config.imap.user,
        pass: config.imap.password,
      },
      logger: false, // Prevent exposing credentials in raw IMAP logs
      emitLogs: false,
    });
  }

  /**
   * Performs a non-destructive connection and authentication check.
   */
  static async checkConnection(): Promise<boolean> {
    if (!config.imap.user || !config.imap.password) {
      logger.warn('[IMAP] Gmail IMAP user or password not configured');
      return false;
    }

    const testClient = this.createClient();
    try {
      await testClient.connect();
      logger.info('✓ Gmail IMAP connection: CONNECTED');
      await testClient.logout();
      return true;
    } catch (err: any) {
      logger.error(`✗ Gmail IMAP connection failed: ${err?.message || err}`);
      try {
        await testClient.logout();
      } catch {
        // ignore logout error on failed connection
      }
      return false;
    }
  }

  /**
   * Retrieves or initializes the persistent UID watermark in the database.
   */
  static async getOrInitWatermark(client: ImapFlow): Promise<{ lastProcessedUid: number; isFirstInit: boolean }> {
    const existing = await prisma.integration.findFirst({
      where: { name: 'GMAIL_IMAP' },
    });

    if (existing && existing.config) {
      const cfg = existing.config as unknown as ImapIntegrationConfig;
      const lastProcessedUid = typeof cfg.lastProcessedUid === 'number'
        ? cfg.lastProcessedUid
        : (typeof cfg.initialBaselineUid === 'number' ? cfg.initialBaselineUid : 0);

      logger.info(`[GMAIL IMAP] Restored last processed UID: ${lastProcessedUid}`);
      logger.info(`[GMAIL IMAP] Listening for emails after UID ${lastProcessedUid}`);
      return { lastProcessedUid, isFirstInit: false };
    }

    // First-time initialization: determine highest existing UID in mailbox
    let currentHighestUid = 0;
    try {
      const allUids = await client.search({ all: true }, { uid: true });
      if (Array.isArray(allUids) && allUids.length > 0) {
        currentHighestUid = Math.max(...allUids);
      }
      if (client.mailbox && client.mailbox.uidNext && client.mailbox.uidNext > 1) {
        currentHighestUid = Math.max(currentHighestUid, client.mailbox.uidNext - 1);
      }
    } catch (err: any) {
      logger.warn(`[GMAIL IMAP] Could not determine highest UID via search, fallback to uidNext: ${err?.message}`);
      if (client.mailbox && client.mailbox.uidNext) {
        currentHighestUid = Math.max(0, client.mailbox.uidNext - 1);
      }
    }

    // Persist initial baseline record
    await prisma.integration.create({
      data: {
        name: 'GMAIL_IMAP',
        type: 'EMAIL',
        status: 'CONNECTED',
        enabled: true,
        config: {
          lastProcessedUid: currentHighestUid,
          initialBaselineUid: currentHighestUid,
          initializedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });

    logger.info(`[GMAIL IMAP] Initial mailbox UID: ${currentHighestUid}`);
    logger.info(`[GMAIL IMAP] Historical emails ignored up to UID ${currentHighestUid}`);
    logger.info('[GMAIL IMAP] Listening for new emails');

    return { lastProcessedUid: currentHighestUid, isFirstInit: true };
  }

  /**
   * Updates the persistent lastProcessedUid in PostgreSQL.
   * Only called AFTER successful ticket / message processing.
   */
  private static async updateLastProcessedUid(newUid: number): Promise<void> {
    const existing = await prisma.integration.findFirst({
      where: { name: 'GMAIL_IMAP' },
    });

    const currentCfg = (existing?.config as unknown as ImapIntegrationConfig) || {
      initialBaselineUid: newUid,
      lastProcessedUid: newUid,
      initializedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await prisma.integration.updateMany({
      where: { name: 'GMAIL_IMAP' },
      data: {
        status: 'CONNECTED',
        config: {
          ...currentCfg,
          lastProcessedUid: newUid,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Starts the background IMAP listener using IMAP IDLE for real-time (1-5s) detection.
   * Does NOT block backend startup.
   */
  static async startListener(): Promise<void> {
    if (this.isListening) {
      logger.info('[GMAIL IMAP] Listener is already running');
      return;
    }

    if (!config.imap.user || !config.imap.password) {
      logger.warn('[GMAIL IMAP] Skipping incoming email listener: IMAP credentials missing in environment');
      return;
    }

    this.isListening = true;
    logger.info('[GMAIL IMAP] Starting real-time IMAP IDLE listener in background...');

    // Launch in background asynchronously without blocking startup
    this.connectAndListen().catch((err) => {
      logger.error(`[GMAIL IMAP] Fatal listener startup error: ${err?.message || err}`);
      if (this.isListening) {
        this.scheduleReconnect();
      }
    });
  }

  /**
   * Stops the IMAP listener cleanly on server shutdown.
   */
  static async stopListener(): Promise<void> {
    this.isListening = false;

    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    logger.info('[GMAIL IMAP] Shutting down listener...');

    if (this.mailboxLock) {
      try {
        this.mailboxLock.release();
        logger.info('[GMAIL IMAP] INBOX closed');
      } catch {
        // ignore
      }
      this.mailboxLock = null;
    }

    if (this.client) {
      try {
        await this.client.logout();
        logger.info('[GMAIL IMAP] Logged out cleanly');
      } catch {
        // ignore
      }
      this.client = null;
    }
    logger.info('[GMAIL IMAP] Listener stopped');
  }

  /**
   * Connects to Gmail, opens INBOX, checks initial emails, and starts IMAP IDLE.
   */
  private static async connectAndListen(): Promise<void> {
    if (!this.isListening) return;

    try {
      this.client = this.createClient();

      this.client.on('error', (err: any) => {
        logger.error(`[GMAIL IMAP] Client error: ${err?.message || err}`);
      });

      this.client.on('close', () => {
        logger.warn('[GMAIL IMAP] Connection closed');
        if (this.isListening) {
          this.scheduleReconnect();
        }
      });

      await this.client.connect();
      this.reconnectAttempts = 0;
      logger.info('[GMAIL IMAP] Listener connected');

      // Acquire lock on INBOX
      this.mailboxLock = await this.client.getMailboxLock('INBOX');
      logger.info('[GMAIL IMAP] INBOX opened');

      // Initialize watermark baseline
      await this.getOrInitWatermark(this.client);

      // Check for any pending emails that arrived while offline
      await this.processPendingMessages();

      // Attach exists event for real-time push from Gmail IMAP IDLE
      this.client.on('exists', async (data: { count: number; prevCount: number }) => {
        logger.info(`[GMAIL IMAP] Mailbox change event detected (count: ${data.count}, prev: ${data.prevCount})`);
        // Immediately process any newer messages with UID > watermark
        await this.processPendingMessages();
      });

      // Start 60-second watchdog timer as fallback
      if (!this.watchdogTimer && this.isListening) {
        this.watchdogTimer = setInterval(async () => {
          if (this.isListening) {
            await this.processPendingMessages();
          }
        }, this.WATCHDOG_INTERVAL_MS);
      }

      // Enter the IDLE loop
      logger.info('[GMAIL IMAP] IDLE started');
      while (this.isListening && this.client && this.client.usable) {
        try {
          await this.client.idle();
        } catch (idleErr: any) {
          if (!this.isListening) break;
          logger.debug(`[GMAIL IMAP] IDLE interrupted: ${idleErr?.message || idleErr}`);
          // Brief pause before re-entering idle
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (err: any) {
      logger.error(`[GMAIL IMAP] Failed to connect/idle: ${err?.message || err}`);
      if (this.isListening) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Exponential backoff reconnect
   */
  private static scheduleReconnect(): void {
    if (this.reconnectTimer || !this.isListening) return;
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      logger.error('[GMAIL IMAP] Maximum reconnect attempts reached. Waiting 5 minutes before retrying.');
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.connectAndListen();
      }, 5 * 60 * 1000);
      return;
    }

    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts - 1), 60000);
    logger.info(`[GMAIL IMAP] Scheduling reconnect in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.isListening) {
        await this.connectAndListen();
      }
    }, delay);
  }

  /**
   * Processes all pending new emails with UID > lastProcessedUid.
   * Strictly preserves watermark ordering and atomicity.
   */
  static async processPendingMessages(): Promise<{ processed: number; errors: number }> {
    if (this.isProcessing) {
      return { processed: 0, errors: 0 };
    }

    this.isProcessing = true;
    let processedCount = 0;
    let errorCount = 0;

    let activeClient = this.client;
    let needCloseLocal = false;
    let localLock: any = null;

    try {
      if (!activeClient || !activeClient.usable) {
        activeClient = this.createClient();
        await activeClient.connect();
        localLock = await activeClient.getMailboxLock('INBOX');
        needCloseLocal = true;
      }

      // Read current watermark
      const record = await prisma.integration.findFirst({
        where: { name: 'GMAIL_IMAP' },
      });
      const cfg = (record?.config as unknown as ImapIntegrationConfig) || null;
      let lastProcessedUid = cfg && typeof cfg.lastProcessedUid === 'number'
        ? cfg.lastProcessedUid
        : (cfg && typeof cfg.initialBaselineUid === 'number' ? cfg.initialBaselineUid : 0);

      // Search for strictly newer emails (UID > lastProcessedUid)
      const searchRange = `${lastProcessedUid + 1}:*`;
      const searchRes = await activeClient.search({ uid: searchRange }, { uid: true });
      const newUids = Array.isArray(searchRes)
        ? searchRes.filter((uid) => uid > lastProcessedUid)
        : [];

      if (newUids.length === 0) {
        return { processed: 0, errors: 0 };
      }

      // Process in strictly ascending UID order (chronological)
      newUids.sort((a, b) => a - b);

      for (const uid of newUids) {
        const startTime = Date.now();
        try {
          const msg = await activeClient.fetchOne(uid, {
            source: true,
            flags: true,
            envelope: true,
          }, { uid: true });

          if (!msg || !msg.source) continue;

          const parsed = await simpleParser(msg.source);
          const messageId = parsed.messageId || `<uid-${uid}-${Date.now()}@imap.gmail.com>`;

          logger.info('[GMAIL IMAP] New email detected');
          logger.info(`[GMAIL IMAP] UID: ${uid}`);
          logger.info(`[GMAIL IMAP] Message-ID: <${messageId}>`);
          logger.info('[GMAIL IMAP] Processing started');

          await this.processSingleParsedEmail(parsed, uid, activeClient);

          // Advance watermark in database ONLY after successful processing
          const prevWatermark = lastProcessedUid;
          await this.updateLastProcessedUid(uid);
          lastProcessedUid = uid;
          logger.info(`[GMAIL IMAP] Watermark advanced: ${prevWatermark} -> ${uid}`);

          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          logger.info(`[GMAIL IMAP] Processing completed in ${duration}s`);

          processedCount++;
        } catch (itemErr: any) {
          errorCount++;
          logger.error(`[GMAIL IMAP] Error processing UID ${uid}: ${itemErr?.message || itemErr}`);
          // CRITICAL: Do NOT advance watermark on failure so the email can be retried cleanly.
          // Stop this pass to preserve monotonic order.
          break;
        }
      }
    } catch (err: any) {
      logger.error(`[GMAIL IMAP] Error during message processing: ${err?.message || err}`);
    } finally {
      if (localLock) {
        try {
          localLock.release();
        } catch {}
      }
      if (needCloseLocal && activeClient) {
        try {
          await activeClient.logout();
        } catch {}
      }
      this.isProcessing = false;
    }

    return { processed: processedCount, errors: errorCount };
  }

  /**
   * Backward-compatible aliases
   */
  static async syncNewEmails(): Promise<{ processed: number; errors: number }> {
    return this.processPendingMessages();
  }

  static async syncUnreadEmails(): Promise<{ processed: number; errors: number }> {
    return this.processPendingMessages();
  }

  static async checkInboxOnce(): Promise<{ processed: number; errors: number }> {
    logger.info('[GMAIL IMAP] Manual inbox check requested');
    return this.processPendingMessages();
  }

  /**
   * Parses and dispatches an incoming email message to EmailService.
   */
  private static async processSingleParsedEmail(
    parsed: ParsedMail,
    uid: number,
    client: ImapFlow
  ): Promise<void> {
    const fromAddress = parsed.from?.value?.[0]?.address || '';
    const fromName = parsed.from?.value?.[0]?.name || '';
    const subject = parsed.subject || '(No Subject)';
    const messageId = parsed.messageId || `<uid-${uid}-${Date.now()}@imap.gmail.com>`;

    // Skip automated system emails (bounces, automated security warnings)
    const isAutomatedSystem =
      /^(no-?reply|notification|follow-suggestions|posts-recap|mailer-daemon|postmaster)@/i.test(fromAddress) ||
      fromAddress.includes('instagram.com') ||
      (fromAddress.includes('google.com') && fromAddress.includes('noreply'));

    if (isAutomatedSystem) {
      logger.info(`[GMAIL IMAP] Skipped automated system email from ${fromAddress} (UID: ${uid})`);
      try {
        await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      } catch {}
      return;
    }

    // Resolve recipient
    let toAddress = config.support.email;
    if (Array.isArray(parsed.to)) {
      toAddress = parsed.to[0]?.value?.[0]?.address || config.support.email;
    } else if (parsed.to?.value?.[0]?.address) {
      toAddress = parsed.to.value[0].address;
    }

    // Extract body text & HTML
    const bodyText = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '');
    const bodyHtml = typeof parsed.html === 'string' ? parsed.html : undefined;

    // References header extraction
    let references: string | undefined = undefined;
    if (Array.isArray(parsed.references)) {
      references = parsed.references.join(' ');
    } else if (typeof parsed.references === 'string') {
      references = parsed.references;
    }

    const inReplyTo = parsed.inReplyTo || undefined;

    // Save attachments to disk
    const savedAttachments: {
      fileName: string;
      originalName: string;
      mimeType: string;
      fileSize: number;
      storagePath: string;
      publicUrl: string;
    }[] = [];

    if (parsed.attachments && parsed.attachments.length > 0) {
      if (!fs.existsSync(config.uploads.dir)) {
        fs.mkdirSync(config.uploads.dir, { recursive: true });
      }

      for (const att of parsed.attachments) {
        try {
          const safeName = att.filename ? att.filename.replace(/[^a-zA-Z0-9._-]/g, '_') : `file_${Date.now()}`;
          const diskFileName = `att-${Date.now()}-${safeName}`;
          const diskPath = path.join(config.uploads.dir, diskFileName);

          await fs.promises.writeFile(diskPath, att.content);

          savedAttachments.push({
            fileName: diskFileName,
            originalName: att.filename || diskFileName,
            mimeType: att.contentType || 'application/octet-stream',
            fileSize: att.size || att.content.length,
            storagePath: diskPath,
            publicUrl: `/uploads/${diskFileName}`,
          });
        } catch (attErr: any) {
          logger.warn(`[GMAIL IMAP] Could not save attachment ${att.filename}: ${attErr?.message}`);
        }
      }
    }

    // Hand off to EmailService:
    // Identifies customer, detects threads (In-Reply-To, References, [CRM-XXXXXX]),
    // creates OPEN & UNASSIGNED ticket or appends reply to existing conversation
    const result = await EmailService.processIncomingEmail({
      from: fromAddress,
      fromName: fromName || undefined,
      to: toAddress,
      subject,
      bodyText,
      bodyHtml,
      messageId,
      inReplyTo,
      references,
      attachments: savedAttachments,
    });

    const ticket: any = result.ticket;

    if (result.isDuplicate) {
      logger.info(`[GMAIL IMAP] Email already processed previously (Message-ID: <${messageId}>)`);
    } else if (result.isNewTicket) {
      logger.info(`[GMAIL IMAP] Ticket created: ${ticket?.ticketNumber}`);
      logger.info('[GMAIL IMAP] Notification created');
    } else {
      logger.info(`[GMAIL IMAP] Appended reply to ticket: ${ticket?.ticketNumber}`);
      logger.info('[GMAIL IMAP] Notification created');
    }

    // Mark email as \Seen in Gmail
    try {
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
    } catch (flagErr: any) {
      logger.warn(`[GMAIL IMAP] Failed to set \\Seen flag on UID ${uid}: ${flagErr?.message}`);
    }
  }
}
