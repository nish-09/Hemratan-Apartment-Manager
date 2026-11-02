import crypto from 'crypto';
import { SocietyService } from './society.service';

export type DeliveryCategory = 'FOOD' | 'GROCERY' | 'COURIER' | 'ECOMMERCE' | 'DOCUMENTS' | 'OTHER';

export type DeliveryStatus =
  | 'RECEIVED'
  | 'NOTIFIED'
  | 'READY_FOR_COLLECTION'
  | 'COLLECTED'
  | 'RETURNED'
  | 'CANCELLED';

export interface DeliveryRecord {
  id: string;
  provider: string;
  trackingNumber?: string;
  recipientName: string;
  flatId: string;
  flatNumber: string;
  wing: string;
  category: DeliveryCategory;
  packageDescription?: string;
  packagePhotoUrl?: string;
  status: DeliveryStatus;
  receivedAt: Date;
  receivedByGuardId?: string;
  collectedAt?: Date;
  collectedByName?: string;
  collectedByResidentId?: string;
  handoverGuardId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryNotificationRecord {
  id: string;
  deliveryId: string;
  flatId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface DeliveryStatusHistoryRecord {
  id: string;
  deliveryId: string;
  fromStatus?: DeliveryStatus;
  toStatus: DeliveryStatus;
  changedBy?: string;
  notes?: string;
  createdAt: Date;
}

// In-memory persistent stores with seed data
let deliveriesStore: DeliveryRecord[] = [];
let notificationsStore: DeliveryNotificationRecord[] = [];
let historyStore: DeliveryStatusHistoryRecord[] = [];

// Seed sample initial deliveries
function initializeSeedDeliveries() {
  deliveriesStore = [
    {
      id: 'del-seed-001',
      provider: 'Amazon',
      trackingNumber: 'TBA98712345678',
      recipientName: 'Jonathan Patel',
      flatId: 'flat-a-402',
      flatNumber: '402',
      wing: 'A',
      category: 'ECOMMERCE',
      packageDescription: 'Medium brown cardboard box - Electronics',
      status: 'READY_FOR_COLLECTION',
      receivedAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      receivedByGuardId: 'usr-guard-003',
      createdAt: new Date(Date.now() - 2 * 3600000),
      updatedAt: new Date(Date.now() - 2 * 3600000),
    },
    {
      id: 'del-seed-002',
      provider: 'Swiggy',
      recipientName: 'Vikram Seth',
      flatId: 'flat-a-101',
      flatNumber: '101',
      wing: 'A',
      category: 'FOOD',
      packageDescription: 'Food bag (Biryani By Kilo)',
      status: 'NOTIFIED',
      receivedAt: new Date(Date.now() - 15 * 60000), // 15 mins ago
      receivedByGuardId: 'usr-guard-003',
      createdAt: new Date(Date.now() - 15 * 60000),
      updatedAt: new Date(Date.now() - 15 * 60000),
    },
    {
      id: 'del-seed-003',
      provider: 'BlueDart',
      trackingNumber: 'BLU88223311',
      recipientName: 'Rosa Palmour',
      flatId: 'flat-a-201',
      flatNumber: '201',
      wing: 'A',
      category: 'DOCUMENTS',
      packageDescription: 'Legal envelope',
      status: 'COLLECTED',
      receivedAt: new Date(Date.now() - 5 * 3600000),
      receivedByGuardId: 'usr-guard-003',
      collectedAt: new Date(Date.now() - 1 * 3600000),
      collectedByName: 'Rosa Palmour',
      collectedByResidentId: 'usr-comm-002',
      handoverGuardId: 'usr-guard-003',
      createdAt: new Date(Date.now() - 5 * 3600000),
      updatedAt: new Date(Date.now() - 1 * 3600000),
    },
  ];

  notificationsStore = [
    {
      id: 'notif-seed-001',
      deliveryId: 'del-seed-001',
      flatId: 'flat-a-402',
      title: 'New Parcel Arrival: Amazon',
      message: 'A parcel from Amazon (TBA98712345678) has arrived at Gate 1 security. Ready for pickup.',
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 3600000),
    },
  ];

  historyStore = [];
}

initializeSeedDeliveries();

export class DeliveryService {
  static resetStore() {
    initializeSeedDeliveries();
  }

  /**
   * Registers a newly arrived parcel or delivery package at the gate.
   * Enforces flat verification, photo limits, and auto-generates in-app resident alert.
   */
  static registerDelivery(data: {
    provider: string;
    trackingNumber?: string;
    recipientName: string;
    flatId: string;
    category: DeliveryCategory;
    packageDescription?: string;
    packagePhotoData?: { storagePath: string; fileSizeBytes: number; mimeType: string };
    receivedByGuardId?: string;
  }): { delivery: DeliveryRecord; notification: DeliveryNotificationRecord } {
    const trimmedProvider = data.provider?.trim();
    if (!trimmedProvider || trimmedProvider.length < 2) {
      throw new Error('Delivery provider name must be at least 2 characters (e.g. Amazon, Swiggy, BlueDart)');
    }

    const trimmedRecipient = data.recipientName?.trim();
    if (!trimmedRecipient || trimmedRecipient.length < 2) {
      throw new Error('Recipient name must be at least 2 characters');
    }

    const flat = SocietyService.getFlatById(data.flatId);
    if (!flat) {
      throw new Error(`Target destination flat with ID "${data.flatId}" does not exist`);
    }

    if (data.packagePhotoData) {
      if (data.packagePhotoData.fileSizeBytes > 10485760) {
        throw new Error('Package photograph exceeds maximum permitted size of 10 MB');
      }
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(data.packagePhotoData.mimeType)) {
        throw new Error('Invalid photograph file type. Only JPEG, PNG, and WebP are allowed.');
      }
    }

    const delivery: DeliveryRecord = {
      id: `del-${crypto.randomUUID()}`,
      provider: trimmedProvider,
      trackingNumber: data.trackingNumber?.trim() || undefined,
      recipientName: trimmedRecipient,
      flatId: flat.id,
      flatNumber: flat.flatNumber,
      wing: flat.wing,
      category: data.category,
      packageDescription: data.packageDescription?.trim() || undefined,
      packagePhotoUrl: data.packagePhotoData?.storagePath,
      status: 'NOTIFIED',
      receivedAt: new Date(),
      receivedByGuardId: data.receivedByGuardId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    deliveriesStore.push(delivery);

    // Record audit status history
    this.recordHistory(delivery.id, undefined, 'RECEIVED', data.receivedByGuardId, 'Package received at Gate 1');
    this.recordHistory(delivery.id, 'RECEIVED', 'NOTIFIED', data.receivedByGuardId, 'Resident in-app alert dispatched');

    // Generate in-app resident notification
    const notification: DeliveryNotificationRecord = {
      id: `notif-${crypto.randomUUID()}`,
      deliveryId: delivery.id,
      flatId: flat.id,
      title: `Parcel Arrived: ${trimmedProvider} (${data.category})`,
      message: `A ${data.category.toLowerCase()} package for ${trimmedRecipient} has arrived at Gate 1 Security. Please collect it at your convenience.`,
      isRead: false,
      createdAt: new Date(),
    };

    notificationsStore.push(notification);

    return { delivery, notification };
  }

  /**
   * Updates delivery status according to strict allowed lifecycle rules.
   */
  static updateStatus(
    deliveryId: string,
    newStatus: DeliveryStatus,
    performedBy?: string,
    notes?: string
  ): DeliveryRecord {
    const delivery = deliveriesStore.find((d) => d.id === deliveryId);
    if (!delivery) {
      throw new Error(`Delivery record with ID "${deliveryId}" not found`);
    }

    if (delivery.status === 'COLLECTED') {
      throw new Error('Cannot change status: This parcel has already been collected and closed');
    }

    if (delivery.status === 'RETURNED' || delivery.status === 'CANCELLED') {
      throw new Error(`Cannot change status: This parcel has already been finalized as "${delivery.status}"`);
    }

    // Handover to resident requires explicit collector info via recordCollection
    if (newStatus === 'COLLECTED') {
      throw new Error('To mark parcel as collected, you must record collector identity via recordCollection()');
    }

    const oldStatus = delivery.status;
    delivery.status = newStatus;
    delivery.updatedAt = new Date();

    this.recordHistory(delivery.id, oldStatus, newStatus, performedBy, notes);

    return delivery;
  }

  /**
   * Secure parcel handover / collection.
   * STRICT ENFORCEMENT: Collector name is mandatory; cannot collect without recording who received it.
   */
  static recordCollection(
    deliveryId: string,
    data: {
      collectedByName: string;
      collectedByResidentId?: string;
      handoverGuardId?: string;
      notes?: string;
    }
  ): DeliveryRecord {
    const delivery = deliveriesStore.find((d) => d.id === deliveryId);
    if (!delivery) {
      throw new Error(`Delivery record with ID "${deliveryId}" not found`);
    }

    if (delivery.status === 'COLLECTED') {
      throw new Error(
        `Parcel has already been collected by ${delivery.collectedByName} at ${delivery.collectedAt?.toLocaleTimeString()}`
      );
    }

    if (delivery.status === 'RETURNED' || delivery.status === 'CANCELLED') {
      throw new Error(`Cannot handover parcel: Current status is "${delivery.status}"`);
    }

    const collector = data.collectedByName?.trim();
    if (!collector || collector.length < 2) {
      throw new Error('Collector name must be recorded before parcel handover can be confirmed');
    }

    const oldStatus = delivery.status;
    delivery.status = 'COLLECTED';
    delivery.collectedAt = new Date();
    delivery.collectedByName = collector;
    delivery.collectedByResidentId = data.collectedByResidentId;
    delivery.handoverGuardId = data.handoverGuardId;
    delivery.updatedAt = new Date();

    this.recordHistory(
      delivery.id,
      oldStatus,
      'COLLECTED',
      data.handoverGuardId,
      data.notes || `Handed over to ${collector}`
    );

    return delivery;
  }

  // --- QUERY & ISOLATION HELPERS ---

  static getDeliveries(filters?: {
    flatId?: string;
    status?: DeliveryStatus;
    category?: DeliveryCategory;
    search?: string;
  }): DeliveryRecord[] {
    let result = [...deliveriesStore];

    if (filters?.flatId) {
      result = result.filter((d) => d.flatId === filters.flatId);
    }

    if (filters?.status) {
      result = result.filter((d) => d.status === filters.status);
    }

    if (filters?.category) {
      result = result.filter((d) => d.category === filters.category);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.provider.toLowerCase().includes(q) ||
          d.recipientName.toLowerCase().includes(q) ||
          d.flatNumber.includes(q) ||
          (d.trackingNumber && d.trackingNumber.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
  }

  static getDeliveryById(id: string): DeliveryRecord | null {
    return deliveriesStore.find((d) => d.id === id) || null;
  }

  static getNotificationsForFlat(flatId: string): DeliveryNotificationRecord[] {
    return notificationsStore
      .filter((n) => n.flatId === flatId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static markNotificationAsRead(id: string): boolean {
    const notif = notificationsStore.find((n) => n.id === id);
    if (!notif) return false;
    notif.isRead = true;
    return true;
  }

  static getStatusHistory(deliveryId: string): DeliveryStatusHistoryRecord[] {
    return historyStore
      .filter((h) => h.deliveryId === deliveryId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static getDeliveryOverview() {
    const totalDeliveries = deliveriesStore.length;
    const pendingCollections = deliveriesStore.filter(
      (d) => d.status === 'RECEIVED' || d.status === 'NOTIFIED' || d.status === 'READY_FOR_COLLECTION'
    ).length;
    const collectedCount = deliveriesStore.filter((d) => d.status === 'COLLECTED').length;
    const returnedCount = deliveriesStore.filter((d) => d.status === 'RETURNED' || d.status === 'CANCELLED').length;

    // Today's received count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayReceived = deliveriesStore.filter((d) => d.receivedAt >= startOfToday).length;

    // Category breakdown
    const categoryBreakdown: Record<DeliveryCategory, number> = {
      FOOD: 0,
      GROCERY: 0,
      COURIER: 0,
      ECOMMERCE: 0,
      DOCUMENTS: 0,
      OTHER: 0,
    };

    for (const d of deliveriesStore) {
      if (categoryBreakdown[d.category] !== undefined) {
        categoryBreakdown[d.category]++;
      }
    }

    return {
      totalDeliveries,
      pendingCollections,
      collectedCount,
      returnedCount,
      todayReceived,
      categoryBreakdown,
    };
  }

  private static recordHistory(
    deliveryId: string,
    fromStatus: DeliveryStatus | undefined,
    toStatus: DeliveryStatus,
    changedBy?: string,
    notes?: string
  ) {
    historyStore.push({
      id: `hist-${crypto.randomUUID()}`,
      deliveryId,
      fromStatus,
      toStatus,
      changedBy,
      notes,
      createdAt: new Date(),
    });
  }
}
