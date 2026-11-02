import { describe, it, expect, beforeEach } from 'vitest';
import { ParkingService } from './parking.service';

describe('ParkingService', () => {
  beforeEach(() => {
    ParkingService.resetStore();
  });

  describe('Configuration & Capacity Management', () => {
    it('initializes with default 5 visitor parking spaces (P1 to P5)', () => {
      const spaces = ParkingService.getSpaces();
      expect(spaces).toHaveLength(5);
      expect(spaces.map((s) => s.displayName)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    });

    it('allows Committee/Admin to add a new parking space (dynamic capacity)', () => {
      const newSpace = ParkingService.createSpace({
        displayName: 'P6',
        parkingType: 'VISITOR',
        location: 'Basement B1',
        vehicleTypeRestriction: 'FOUR_WHEELER',
        performedBy: 'usr-comm-002',
      });

      expect(newSpace.displayName).toBe('P6');
      expect(newSpace.location).toBe('Basement B1');
      expect(ParkingService.getSpaces()).toHaveLength(6);
    });

    it('rejects creating spaces with duplicate display names', () => {
      expect(() =>
        ParkingService.createSpace({ displayName: 'P1' })
      ).toThrow('already exists');
    });

    it('updates space location and vehicle restrictions', () => {
      const p1 = ParkingService.getSpaces()[0];
      const updated = ParkingService.updateSpace(p1.id, {
        location: 'East Wing Annex',
        vehicleTypeRestriction: 'FOUR_WHEELER',
      });

      expect(updated.location).toBe('East Wing Annex');
      expect(updated.vehicleTypeRestriction).toBe('FOUR_WHEELER');
    });

    it('deactivates and reactivates a parking space', () => {
      const p2 = ParkingService.getSpaces()[1];
      const deactivated = ParkingService.updateSpace(p2.id, { isActive: false });
      expect(deactivated.isActive).toBe(false);

      const overview = ParkingService.getAvailabilityOverview();
      expect(overview.totalSpaces).toBe(4); // 4 active spaces remaining
    });

    it('prevents deactivating or deleting a space that has an active vehicle parked', () => {
      const p1 = ParkingService.getSpaces()[0];
      ParkingService.allocateParking({
        parkingSpaceId: p1.id,
        vehicleNumber: 'MH02AB1234',
        vehicleType: 'FOUR_WHEELER',
      });

      expect(() =>
        ParkingService.updateSpace(p1.id, { isActive: false })
      ).toThrow('Cannot deactivate space "P1" while a vehicle is actively parked');

      expect(() =>
        ParkingService.removeSpace(p1.id)
      ).toThrow('Cannot delete space "P1" because it currently has an active vehicle parked');
    });
  });

  describe('Allocation & Concurrency Protection', () => {
    it('successfully allocates an available parking space', () => {
      const p1 = ParkingService.getSpaces()[0];
      const allocation = ParkingService.allocateParking({
        parkingSpaceId: p1.id,
        vehicleNumber: 'MH 12 CD 5678',
        vehicleType: 'FOUR_WHEELER',
        flatId: 'flat-a-402',
        guardId: 'usr-guard-003',
        expectedDurationMinutes: 60,
      });

      expect(allocation.parkingSpaceDisplayName).toBe('P1');
      expect(allocation.vehicleNumber).toBe('MH12CD5678');
      expect(allocation.status).toBe('ACTIVE');
      expect(allocation.expectedDurationMinutes).toBe(60);

      // Verify availability updated
      const overview = ParkingService.getAvailabilityOverview();
      expect(overview.occupiedSpaces).toBe(1);
      expect(overview.availableSpaces).toBe(4);
    });

    it('PREVENTS CONCURRENT/DOUBLE ALLOCATION: rejects allocating already occupied space', () => {
      const p1 = ParkingService.getSpaces()[0];
      ParkingService.allocateParking({
        parkingSpaceId: p1.id,
        vehicleNumber: 'MH01AA1111',
        vehicleType: 'FOUR_WHEELER',
      });

      // Second vehicle attempts to take the same space
      expect(() =>
        ParkingService.allocateParking({
          parkingSpaceId: p1.id,
          vehicleNumber: 'MH02BB2222',
          vehicleType: 'FOUR_WHEELER',
        })
      ).toThrow('already occupied by vehicle MH01AA1111');
    });

    it('rejects duplicate allocation for the same vehicle across different spaces', () => {
      const spaces = ParkingService.getSpaces();
      ParkingService.allocateParking({
        parkingSpaceId: spaces[0].id,
        vehicleNumber: 'MH04XY9999',
        vehicleType: 'FOUR_WHEELER',
      });

      // Same vehicle attempts to allocate space P2
      expect(() =>
        ParkingService.allocateParking({
          parkingSpaceId: spaces[1].id,
          vehicleNumber: 'MH04XY9999',
          vehicleType: 'FOUR_WHEELER',
        })
      ).toThrow('already actively allocated to parking space "P1"');
    });

    it('rejects allocating to an inactive or disabled parking space', () => {
      const p4 = ParkingService.getSpaces()[3];
      ParkingService.updateSpace(p4.id, { isActive: false });

      expect(() =>
        ParkingService.allocateParking({
          parkingSpaceId: p4.id,
          vehicleNumber: 'MH05ZZ0000',
          vehicleType: 'FOUR_WHEELER',
        })
      ).toThrow('is currently inactive/disabled');
    });

    it('enforces vehicle type restrictions (two-wheeler space rejects car)', () => {
      const p5 = ParkingService.getSpaces().find((s) => s.displayName === 'P5')!; // P5 restricted to TWO_WHEELER
      expect(() =>
        ParkingService.allocateParking({
          parkingSpaceId: p5.id,
          vehicleNumber: 'MH02CAR123',
          vehicleType: 'FOUR_WHEELER',
        })
      ).toThrow(/restricted to TWO WHEELERs only/i);
    });
  });

  describe('Checkout, Release & Overdue Detection', () => {
    it('checks out an active parking allocation and immediately releases the space', () => {
      const p1 = ParkingService.getSpaces()[0];
      const allocation = ParkingService.allocateParking({
        parkingSpaceId: p1.id,
        vehicleNumber: 'DL01AA9999',
        vehicleType: 'FOUR_WHEELER',
      });

      expect(ParkingService.getAvailabilityOverview().occupiedSpaces).toBe(1);

      const checkedOut = ParkingService.checkoutParking(allocation.id, 'usr-guard-003');
      expect(checkedOut.status).toBe('COMPLETED');
      expect(checkedOut.checkedOutAt).toBeDefined();

      // Verify space is immediately available again
      const overview = ParkingService.getAvailabilityOverview();
      expect(overview.occupiedSpaces).toBe(0);
      expect(overview.availableSpaces).toBe(5);
    });

    it('prevents duplicate checkout on already completed allocations', () => {
      const p1 = ParkingService.getSpaces()[0];
      const allocation = ParkingService.allocateParking({
        parkingSpaceId: p1.id,
        vehicleNumber: 'DL01AA9999',
        vehicleType: 'FOUR_WHEELER',
      });

      ParkingService.checkoutParking(allocation.id);

      expect(() => ParkingService.checkoutParking(allocation.id)).toThrow(
        'has already been checked out'
      );
    });

    it('automatically checks out parking allocation by visitId', () => {
      const p2 = ParkingService.getSpaces()[1];
      const visitId = 'visit-sample-123';

      ParkingService.allocateParking({
        parkingSpaceId: p2.id,
        visitId,
        vehicleNumber: 'MH03QQ3333',
        vehicleType: 'FOUR_WHEELER',
      });

      expect(ParkingService.getActiveAllocationForSpace(p2.id)).not.toBeNull();

      const released = ParkingService.checkoutByVisitId(visitId, 'usr-guard-003');
      expect(released).not.toBeNull();
      expect(released?.status).toBe('COMPLETED');
      expect(ParkingService.getActiveAllocationForSpace(p2.id)).toBeNull();
    });

    it('flags allocation as OVERDUE when duration has elapsed without auto-releasing', () => {
      const p3 = ParkingService.getSpaces()[2];
      const allocation = ParkingService.allocateParking({
        parkingSpaceId: p3.id,
        vehicleNumber: 'MH02OV1111',
        vehicleType: 'FOUR_WHEELER',
        expectedDurationMinutes: 30,
      });

      // Artificially age the allocation to 45 minutes ago
      allocation.allocatedAt = new Date(Date.now() - 45 * 60 * 1000);

      const overview = ParkingService.getAvailabilityOverview();
      expect(overview.overdueCount).toBe(1);

      const p3Status = overview.spaces.find((s) => s.id === p3.id);
      expect(p3Status?.computedStatus).toBe('OVERDUE');
      // Overdue space must REMAIN occupied, NOT released
      expect(overview.availableSpaces).toBe(4);
      expect(overview.occupiedSpaces).toBe(1);
    });
  });

  describe('Audit Logging', () => {
    it('creates audit records for all space mutations and allocation actions', () => {
      const p1 = ParkingService.getSpaces()[0];
      const alloc = ParkingService.allocateParking({
        parkingSpaceId: p1.id,
        vehicleNumber: 'KA01AA1234',
        vehicleType: 'FOUR_WHEELER',
      });
      ParkingService.checkoutParking(alloc.id);

      const logs = ParkingService.getAuditLogs();
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some((l) => l.action === 'ALLOCATED')).toBe(true);
      expect(logs.some((l) => l.action === 'CHECKED_OUT')).toBe(true);
    });
  });
});
