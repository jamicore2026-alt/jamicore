// Real-time Notifications Service � SSE streams and notification CRUD
import { db } from '../../db/index.js';
import { merchantNotifications } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

// SSE clients per store
const sseClients = new Map<string, Set<{ write: (data: string) => void; close: () => void }>>();

export const notificationService = {
  async createNotification(data: {
    storeId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    const [notification] = await db.insert(merchantNotifications).values({
      storeId: data.storeId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data ?? null,
    }).returning();

    // Push to SSE clients
    this.broadcast(data.storeId, {
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data,
      createdAt: notification.createdAt,
    });

    return notification;
  },

  async getNotifications(storeId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
    const conditions = [eq(merchantNotifications.storeId, storeId)];
    if (opts?.unreadOnly) {
      conditions.push(eq(merchantNotifications.isRead, false));
    }

    return db.query.merchantNotifications.findMany({
      where: and(...conditions),
      orderBy: desc(merchantNotifications.createdAt),
      limit: opts?.limit ?? 50,
    });
  },

  async markAsRead(notificationId: string, storeId: string) {
    const [updated] = await db.update(merchantNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(merchantNotifications.id, notificationId),
        eq(merchantNotifications.storeId, storeId),
      ))
      .returning();
    return updated;
  },

  async markAllAsRead(storeId: string) {
    await db.update(merchantNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(merchantNotifications.storeId, storeId),
        eq(merchantNotifications.isRead, false),
      ));
  },

  async getUnreadCount(storeId: string) {
    const result = await db.select({ count: sql`count(*)` })
      .from(merchantNotifications)
      .where(and(
        eq(merchantNotifications.storeId, storeId),
        eq(merchantNotifications.isRead, false),
      ));
    return Number(result[0]?.count ?? 0);
  },

  // SSE
  subscribe(storeId: string, client: { write: (data: string) => void; close: () => void }) {
    if (!sseClients.has(storeId)) {
      sseClients.set(storeId, new Set());
    }
    sseClients.get(storeId)!.add(client);
  },

  unsubscribe(storeId: string, client: { write: (data: string) => void; close: () => void }) {
    const clients = sseClients.get(storeId);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        sseClients.delete(storeId);
      }
    }
  },

  broadcast(storeId: string, payload: Record<string, unknown>) {
    const clients = sseClients.get(storeId);
    if (!clients) return;
    const data = 'data: ' + JSON.stringify(payload) + '\n\n';
    for (const client of clients) {
      try {
        client.write(data);
      } catch {
        client.close();
        clients.delete(client);
      }
    }
  },
};