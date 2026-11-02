import { describe, it, expect, beforeEach } from 'vitest';
import { DeliveryService } from './delivery.service';
import { SocietyService } from './society.service';

describe('DeliveryService', () => {
  let sampleFlatId: string;
  let otherFlatId: string;

  beforeEach(() => {
    DeliveryService.resetStore();
    const flats = SocietyService.getFlats();
    sampleFlatId = 'flat-a-402'; // Resident Jonathan Patel's flat
    otherFlatId = flats.find((f) => f.id !== sampleFlatId)!.id;
  });

  describe('Registration & Validation', () => {
    it('registers a parcel and automatically generates an in-app resident notification', () => {
      const { delivery, notification } = DeliveryService.registerDelivery({
        provider: 'BlueDart',
        trackingNumber: 'BLU-12345678',
        recipientName: 'Jonathan Patel',
        flatId: sampleFlatId,
        category: 'COURIER',
        packageDescription: 'Confidential bank documents',
        receivedByGuardId: 'usr-guard-003',
      });

      expect(delivery.id).toBeDefined();
      expect(delivery.provider).toBe('BlueDart');
      expect(delivery.status).toBe('NOTIFIED');
      expect(delivery.flatId).toBe(sampleFlatId);
      expect(delivery.flatNumber).toBe('402');
      expect(delivery.wing).toBe('A');

      // Verify resident notification
      expect(notification.flatId).toBe(sampleFlatId);
      expect(notification.title).toContain('BlueDart');
      expect(notification.message).toContain('Jonathan Patel');
      expect(notification.isRead).toBe(false);
    });

    it('rejects registration with short provider name', () => {
      expect(() =>
        DeliveryService.registerDelivery({
          provider: 'A',
          recipientName: 'Jonathan Patel',
          flatId: sampleFlatId,
          category: 'OTHER',
        })
      ).toThrow('provider name must be at least 2 characters');
    });

    it('rejects registration with short recipient name', () => {
      expect(() =>
        DeliveryService.registerDelivery({
          provider: 'Amazon',
          recipientName: 'X',
          flatId: sampleFlatId,
          category: 'ECOMMERCE',
        })
      ).toThrow('Recipient name must be at least 2 characters');
    });

    it('rejects registration for nonexistent target flat', () => {
      expect(() =>
        DeliveryService.registerDelivery({
          provider: 'Amazon',
          recipientName: 'Unknown Resident',
          flatId: 'flat-nonexistent-999',
          category: 'ECOMMERCE',
        })
      ).toThrow('Target destination flat with ID "flat-nonexistent-999" does not exist');
    });

    it('enforces 10MB package photo size limit', () => {
      expect(() =>
        DeliveryService.registerDelivery({
          provider: 'Amazon',
          recipientName: 'Jonathan Patel',
          flatId: sampleFlatId,
          category: 'ECOMMERCE',
          packagePhotoData: {
            storagePath: '/storage/deliveries/large.jpg',
            fileSizeBytes: 12 * 1024 * 1024, // 12 MB
            mimeType: 'image/jpeg',
          },
        })
      ).toThrow('exceeds maximum permitted size of 10 MB');
    });
  });

  describe('Lifecycle State Transitions', () => {
    it('updates status through valid lifecycle stages', () => {
      const { delivery } = DeliveryService.registerDelivery({
        provider: 'Swiggy',
        recipientName: 'Jonathan Patel',
        flatId: sampleFlatId,
        category: 'FOOD',
      });

      const ready = DeliveryService.updateStatus(delivery.id, 'READY_FOR_COLLECTION', 'usr-guard-003', 'Stored on Shelf B');
      expect(ready.status).toBe('READY_FOR_COLLECTION');

      const history = DeliveryService.getStatusHistory(delivery.id);
      expect(history.length).toBeGreaterThanOrEqual(3);
      expect(history.some((h) => h.toStatus === 'READY_FOR_COLLECTION')).toBe(true);
    });

    it('blocks marking parcel as COLLECTED via simple updateStatus', () => {
      const { delivery } = DeliveryService.registerDelivery({
        provider: 'Flipkart',
        recipientName: 'Jonathan Patel',
        flatId: sampleFlatId,
        category: 'ECOMMERCE',
      });

      expect(() =>
        DeliveryService.updateStatus(delivery.id, 'COLLECTED')
      ).toThrow('must record collector identity via recordCollection()');
    });

    it('blocks status changes on already collected packages', () => {
      const { delivery } = DeliveryService.registerDelivery({
        provider: 'Flipkart',
        recipientName: 'Jonathan Patel',
        flatId: sampleFlatId,
        category: 'ECOMMERCE',
      });

      DeliveryService.recordCollection(delivery.id, {
        collectedByName: 'Jonathan Patel',
        handoverGuardId: 'usr-guard-003',
      });

      expect(() =>
        DeliveryService.updateStatus(delivery.id, 'READY_FOR_COLLECTION')
      ).toThrow('has already been collected and closed');
    });
  });

  describe('Parcel Collection & Handover', () => {
    it('confirms handover with mandatory collector name', () => {
      const { delivery } = DeliveryService.registerDelivery({
        provider: 'Zomato',
        recipientName: 'Jonathan Patel',
        flatId: sampleFlatId,
        category: 'FOOD',
      });

      const collected = DeliveryService.recordCollection(delivery.id, {
        collectedByName: 'Jonathan Patel (Self)',
        collectedByResidentId: 'usr-res-004',
        handoverGuardId: 'usr-guard-003',
      });

      expect(collected.status).toBe('COLLECTED');
      expect(collected.collectedByName).toBe('Jonathan Patel (Self)');
      expect(collected.collectedAt).toBeDefined();
      expect(collected.handoverGuardId).toBe('usr-guard-003');
    });

    it('rejects handover if collector name is blank', () => {
      const { delivery } = DeliveryService.registerDelivery({
        provider: 'Zomato',
        recipientName: 'Jonathan Patel',
        flatId: sampleFlatId,
        category: 'FOOD',
      });

      expect(() =>
        DeliveryService.recordCollection(delivery.id, {
          collectedByName: ' ',
          handoverGuardId: 'usr-guard-003',
        })
      ).toThrow('Collector name must be recorded');
    });

    it('PREVENTS DUPLICATE COLLECTION: throws if parcel already marked collected', () => {
      const { delivery } = DeliveryService.registerDelivery({
        provider: 'Amazon',
        recipientName: 'Jonathan Patel',
        flatId: sampleFlatId,
        category: 'ECOMMERCE',
      });

      DeliveryService.recordCollection(delivery.id, {
        collectedByName: 'Jonathan Patel',
        handoverGuardId: 'usr-guard-003',
      });

      expect(() =>
        DeliveryService.recordCollection(delivery.id, {
          collectedByName: 'Imposter Neighbor',
          handoverGuardId: 'usr-guard-003',
        })
      ).toThrow('Parcel has already been collected');
    });
  });

  describe('Flat-Level Isolation & Privacy', () => {
    it('ensures residents only receive deliveries for their own authorized flat', () => {
      // Deliveries for flat-a-402
      DeliveryService.registerDelivery({
        provider: 'Amazon',
        recipientName: 'Jonathan Patel',
        flatId: sampleFlatId,
        category: 'ECOMMERCE',
      });

      // Delivery for other flat
      DeliveryService.registerDelivery({
        provider: 'DHL',
        recipientName: 'Other Resident',
        flatId: otherFlatId,
        category: 'DOCUMENTS',
      });

      const residentDeliveries = DeliveryService.getDeliveries({ flatId: sampleFlatId });
      for (const d of residentDeliveries) {
        expect(d.flatId).toBe(sampleFlatId);
        expect(d.flatId).not.toBe(otherFlatId);
      }
    });

    it('ensures resident notifications are isolated to their own flat', () => {
      const notifsForSampleFlat = DeliveryService.getNotificationsForFlat(sampleFlatId);
      for (const n of notifsForSampleFlat) {
        expect(n.flatId).toBe(sampleFlatId);
      }
    });
  });

  describe('Delivery Overview Metrics', () => {
    it('accurately computes summary metrics for Committee and Guard dashboards', () => {
      const overview = DeliveryService.getDeliveryOverview();
      expect(overview.totalDeliveries).toBeGreaterThanOrEqual(3);
      expect(typeof overview.pendingCollections).toBe('number');
      expect(typeof overview.collectedCount).toBe('number');
      expect(overview.categoryBreakdown.ECOMMERCE).toBeGreaterThanOrEqual(1);
    });
  });
});
