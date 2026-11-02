import crypto from 'crypto';

export type ParkingType = 'VISITOR' | 'TWO_WHEELER' | 'FOUR_WHEELER' | 'RESERVED';
export type VehicleType = 'TWO_WHEELER' | 'FOUR_WHEELER';
export type VehicleRestriction = 'TWO_WHEELER' | 'FOUR_WHEELER' | 'ANY';
export type AllocationStatus = 'ACTIVE' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';

export interface ParkingSpaceRecord {
  id: string;
  displayName: string;
  parkingType: ParkingType;
  location: string;
  isActive: boolean;
  vehicleTypeRestriction: VehicleRestriction;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingAllocationRecord {
  id: string;
  parkingSpaceId: string;
  parkingSpaceDisplayName: string;
  visitId?: string;
  flatId?: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  allocatedByGuardId?: string;
  checkedOutByGuardId?: string;
  status: AllocationStatus;
  expectedDurationMinutes: number;
  allocatedAt: Date;
  checkedOutAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingAuditLog {
  id: string;
  parkingSpaceId?: string;
  allocationId?: string;
  action: 'SPACE_CREATED' | 'SPACE_UPDATED' | 'SPACE_DEACTIVATED' | 'ALLOCATED' | 'CHECKED_OUT' | 'OVERDUE_FLAGGED';
  performedBy?: string;
  details: Record<string, any>;
  createdAt: Date;
}

// In-memory persistent stores with initial seed
let spacesStore: ParkingSpaceRecord[] = [];
let allocationsStore: ParkingAllocationRecord[] = [];
let auditLogsStore: ParkingAuditLog[] = [];

// Seed default initial spaces P1 to P5
function initializeDefaultSpaces() {
  spacesStore = [
    {
      id: 'space-p1',
      displayName: 'P1',
      parkingType: 'VISITOR',
      location: 'Courtyard Gate 1',
      isActive: true,
      vehicleTypeRestriction: 'ANY',
      notes: 'Visitor slot near main security checkpoint',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'space-p2',
      displayName: 'P2',
      parkingType: 'VISITOR',
      location: 'Courtyard Gate 1',
      isActive: true,
      vehicleTypeRestriction: 'ANY',
      notes: 'Visitor slot near main gate',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'space-p3',
      displayName: 'P3',
      parkingType: 'VISITOR',
      location: 'Courtyard Gate 1',
      isActive: true,
      vehicleTypeRestriction: 'FOUR_WHEELER',
      notes: 'Large car visitor bay',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'space-p4',
      displayName: 'P4',
      parkingType: 'VISITOR',
      location: 'Courtyard Gate 1',
      isActive: true,
      vehicleTypeRestriction: 'ANY',
      notes: 'General visitor parking',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'space-p5',
      displayName: 'P5',
      parkingType: 'VISITOR',
      location: 'Courtyard Gate 1',
      isActive: true,
      vehicleTypeRestriction: 'TWO_WHEELER',
      notes: 'Two-wheeler visitor bay',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  allocationsStore = [];
  auditLogsStore = [];
}

// Initialize seed
initializeDefaultSpaces();

export class ParkingService {
  /**
   * Resets stores to default seed state (used for automated tests).
   */
  static resetStore() {
    initializeDefaultSpaces();
  }

  /**
   * Normalizes Indian vehicle registration plates (e.g. "mh 02 ab 1234" -> "MH-02-AB-1234").
   */
  static formatVehicleNumber(rawNumber: string): string {
    const cleaned = rawNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length < 4) {
      throw new Error('Vehicle registration number must be at least 4 alphanumeric characters');
    }
    return cleaned;
  }

  // --- SPACE CONFIGURATION (Committee & Super Admin) ---

  static getSpaces(): ParkingSpaceRecord[] {
    return [...spacesStore].sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { numeric: true }));
  }

  static getSpaceById(id: string): ParkingSpaceRecord | null {
    return spacesStore.find((s) => s.id === id) || null;
  }

  static createSpace(data: {
    displayName: string;
    parkingType?: ParkingType;
    location?: string;
    vehicleTypeRestriction?: VehicleRestriction;
    notes?: string;
    performedBy?: string;
  }): ParkingSpaceRecord {
    const trimmedName = data.displayName.trim().toUpperCase();
    if (!trimmedName) {
      throw new Error('Parking display name is required (e.g. P6, B1-12)');
    }

    if (spacesStore.some((s) => s.displayName === trimmedName)) {
      throw new Error(`Parking space with display name "${trimmedName}" already exists`);
    }

    const newSpace: ParkingSpaceRecord = {
      id: `space-${crypto.randomUUID()}`,
      displayName: trimmedName,
      parkingType: data.parkingType || 'VISITOR',
      location: data.location || 'Courtyard Gate 1',
      isActive: true,
      vehicleTypeRestriction: data.vehicleTypeRestriction || 'ANY',
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    spacesStore.push(newSpace);

    this.logAudit({
      parkingSpaceId: newSpace.id,
      action: 'SPACE_CREATED',
      performedBy: data.performedBy,
      details: { space: newSpace },
    });

    return newSpace;
  }

  static updateSpace(
    id: string,
    updates: Partial<Pick<ParkingSpaceRecord, 'displayName' | 'parkingType' | 'location' | 'isActive' | 'vehicleTypeRestriction' | 'notes'>>,
    performedBy?: string
  ): ParkingSpaceRecord {
    const space = spacesStore.find((s) => s.id === id);
    if (!space) {
      throw new Error(`Parking space with ID "${id}" not found`);
    }

    if (updates.displayName) {
      const trimmed = updates.displayName.trim().toUpperCase();
      if (trimmed !== space.displayName && spacesStore.some((s) => s.displayName === trimmed)) {
        throw new Error(`Parking space name "${trimmed}" is already in use`);
      }
      space.displayName = trimmed;
    }

    if (updates.parkingType !== undefined) space.parkingType = updates.parkingType;
    if (updates.location !== undefined) space.location = updates.location;
    if (updates.vehicleTypeRestriction !== undefined) space.vehicleTypeRestriction = updates.vehicleTypeRestriction;
    if (updates.notes !== undefined) space.notes = updates.notes;
    if (updates.isActive !== undefined) {
      // If deactivating, ensure space has no active allocation
      if (updates.isActive === false && this.getActiveAllocationForSpace(id)) {
        throw new Error(`Cannot deactivate space "${space.displayName}" while a vehicle is actively parked in it`);
      }
      space.isActive = updates.isActive;
    }

    space.updatedAt = new Date();

    this.logAudit({
      parkingSpaceId: space.id,
      action: 'SPACE_UPDATED',
      performedBy,
      details: { updates },
    });

    return space;
  }

  static removeSpace(id: string, performedBy?: string): boolean {
    const index = spacesStore.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Parking space with ID "${id}" not found`);
    }

    const space = spacesStore[index];
    if (this.getActiveAllocationForSpace(id)) {
      throw new Error(`Cannot delete space "${space.displayName}" because it currently has an active vehicle parked`);
    }

    spacesStore.splice(index, 1);

    this.logAudit({
      parkingSpaceId: id,
      action: 'SPACE_DEACTIVATED',
      performedBy,
      details: { deletedDisplayName: space.displayName },
    });

    return true;
  }

  // --- PARKING ALLOCATION (Guard Workflow) ---

  static getActiveAllocationForSpace(spaceId: string): ParkingAllocationRecord | null {
    this.refreshOverdueAllocations();
    return allocationsStore.find((a) => a.parkingSpaceId === spaceId && (a.status === 'ACTIVE' || a.status === 'OVERDUE')) || null;
  }

  static allocateParking(data: {
    parkingSpaceId: string;
    vehicleNumber: string;
    vehicleType: VehicleType;
    visitId?: string;
    flatId?: string;
    guardId?: string;
    expectedDurationMinutes?: number;
    notes?: string;
  }): ParkingAllocationRecord {
    this.refreshOverdueAllocations();

    const formattedVehicle = this.formatVehicleNumber(data.vehicleNumber);

    // 1. Verify space exists and is active
    const space = spacesStore.find((s) => s.id === data.parkingSpaceId);
    if (!space) {
      throw new Error(`Invalid parking space ID: "${data.parkingSpaceId}" does not exist`);
    }

    if (!space.isActive) {
      throw new Error(`Parking space "${space.displayName}" is currently inactive/disabled`);
    }

    // 2. Validate vehicle type compatibility
    if (space.vehicleTypeRestriction !== 'ANY' && space.vehicleTypeRestriction !== data.vehicleType) {
      throw new Error(
        `Space "${space.displayName}" is restricted to ${space.vehicleTypeRestriction.replace('_', ' ')}s only. Cannot park ${data.vehicleType.replace('_', ' ')}.`
      );
    }

    // 3. Prevent allocating already occupied space (Concurrency safety check)
    const existingSpaceOccupant = this.getActiveAllocationForSpace(space.id);
    if (existingSpaceOccupant) {
      throw new Error(
        `Parking space "${space.displayName}" is already occupied by vehicle ${existingSpaceOccupant.vehicleNumber} (Status: ${existingSpaceOccupant.status})`
      );
    }

    // 4. Prevent duplicate allocation for the same vehicle
    const vehicleAlreadyParked = allocationsStore.find(
      (a) => (a.status === 'ACTIVE' || a.status === 'OVERDUE') && a.vehicleNumber === formattedVehicle
    );
    if (vehicleAlreadyParked) {
      throw new Error(
        `Vehicle ${formattedVehicle} is already actively allocated to parking space "${vehicleAlreadyParked.parkingSpaceDisplayName}"`
      );
    }

    // 5. Prevent duplicate allocation for the same visit
    if (data.visitId) {
      const visitAlreadyParked = allocationsStore.find(
        (a) => (a.status === 'ACTIVE' || a.status === 'OVERDUE') && a.visitId === data.visitId
      );
      if (visitAlreadyParked) {
        throw new Error(
          `This visit already has an active parking allocation on space "${visitAlreadyParked.parkingSpaceDisplayName}"`
        );
      }
    }

    const duration = data.expectedDurationMinutes && data.expectedDurationMinutes > 0 ? data.expectedDurationMinutes : 120; // Default 2 hours

    const allocation: ParkingAllocationRecord = {
      id: `alloc-${crypto.randomUUID()}`,
      parkingSpaceId: space.id,
      parkingSpaceDisplayName: space.displayName,
      visitId: data.visitId,
      flatId: data.flatId,
      vehicleNumber: formattedVehicle,
      vehicleType: data.vehicleType,
      allocatedByGuardId: data.guardId,
      status: 'ACTIVE',
      expectedDurationMinutes: duration,
      allocatedAt: new Date(),
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    allocationsStore.push(allocation);

    this.logAudit({
      parkingSpaceId: space.id,
      allocationId: allocation.id,
      action: 'ALLOCATED',
      performedBy: data.guardId,
      details: {
        vehicleNumber: formattedVehicle,
        vehicleType: data.vehicleType,
        expectedDurationMinutes: duration,
      },
    });

    return allocation;
  }

  // --- CHECKOUT & RELEASE ---

  static checkoutParking(allocationId: string, guardId?: string): ParkingAllocationRecord {
    this.refreshOverdueAllocations();

    const allocation = allocationsStore.find((a) => a.id === allocationId);
    if (!allocation) {
      throw new Error(`Parking allocation with ID "${allocationId}" not found`);
    }

    if (allocation.status === 'COMPLETED') {
      throw new Error('This parking allocation has already been checked out');
    }

    if (allocation.status === 'CANCELLED') {
      throw new Error('Cannot checkout a cancelled parking allocation');
    }

    allocation.status = 'COMPLETED';
    allocation.checkedOutAt = new Date();
    allocation.checkedOutByGuardId = guardId;
    allocation.updatedAt = new Date();

    this.logAudit({
      parkingSpaceId: allocation.parkingSpaceId,
      allocationId: allocation.id,
      action: 'CHECKED_OUT',
      performedBy: guardId,
      details: {
        vehicleNumber: allocation.vehicleNumber,
        parkedDurationMinutes: Math.round((allocation.checkedOutAt.getTime() - allocation.allocatedAt.getTime()) / 60000),
      },
    });

    return allocation;
  }

  /**
   * Releases any active parking allocation linked to a visitor visit.
   * Seamlessly integrated into visitor checkout!
   */
  static checkoutByVisitId(visitId: string, guardId?: string): ParkingAllocationRecord | null {
    const allocation = allocationsStore.find(
      (a) => a.visitId === visitId && (a.status === 'ACTIVE' || a.status === 'OVERDUE')
    );
    if (!allocation) return null;

    return this.checkoutParking(allocation.id, guardId);
  }

  // --- OVERDUE MONITORING ---

  static refreshOverdueAllocations(): void {
    const now = Date.now();
    for (const alloc of allocationsStore) {
      if (alloc.status === 'ACTIVE') {
        const expiryTime = alloc.allocatedAt.getTime() + alloc.expectedDurationMinutes * 60 * 1000;
        if (now > expiryTime) {
          alloc.status = 'OVERDUE';
          alloc.updatedAt = new Date();
          this.logAudit({
            parkingSpaceId: alloc.parkingSpaceId,
            allocationId: alloc.id,
            action: 'OVERDUE_FLAGGED',
            details: {
              overdueMinutes: Math.round((now - expiryTime) / 60000),
            },
          });
        }
      }
    }
  }

  // --- AVAILABILITY DASHBOARD & METRICS ---

  static getAvailabilityOverview() {
    this.refreshOverdueAllocations();

    const activeSpaces = spacesStore.filter((s) => s.isActive);
    const totalSpaces = activeSpaces.length;

    const spacesWithStatus = spacesStore.map((space) => {
      const activeAlloc = allocationsStore.find(
        (a) => a.parkingSpaceId === space.id && (a.status === 'ACTIVE' || a.status === 'OVERDUE')
      );

      let computedStatus: 'AVAILABLE' | 'OCCUPIED' | 'OVERDUE' | 'INACTIVE';
      if (!space.isActive) {
        computedStatus = 'INACTIVE';
      } else if (activeAlloc?.status === 'OVERDUE') {
        computedStatus = 'OVERDUE';
      } else if (activeAlloc?.status === 'ACTIVE') {
        computedStatus = 'OCCUPIED';
      } else {
        computedStatus = 'AVAILABLE';
      }

      return {
        ...space,
        computedStatus,
        activeAllocation: activeAlloc || null,
      };
    });

    const occupiedSpacesCount = spacesWithStatus.filter(
      (s) => s.computedStatus === 'OCCUPIED' || s.computedStatus === 'OVERDUE'
    ).length;
    const overdueCount = spacesWithStatus.filter((s) => s.computedStatus === 'OVERDUE').length;
    const availableSpacesCount = spacesWithStatus.filter((s) => s.computedStatus === 'AVAILABLE').length;

    // Recently vacated (checked out in past 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentlyVacatedCount = allocationsStore.filter(
      (a) => a.status === 'COMPLETED' && a.checkedOutAt && a.checkedOutAt.getTime() > oneDayAgo
    ).length;

    return {
      totalSpaces,
      occupiedSpaces: occupiedSpacesCount,
      availableSpaces: availableSpacesCount,
      overdueCount,
      recentlyVacatedCount,
      spaces: spacesWithStatus,
    };
  }

  static getAllocations(filters?: {
    status?: AllocationStatus;
    flatId?: string;
    vehicleNumber?: string;
    spaceId?: string;
  }): ParkingAllocationRecord[] {
    this.refreshOverdueAllocations();

    let result = [...allocationsStore];

    if (filters?.status) {
      result = result.filter((a) => a.status === filters.status);
    }

    if (filters?.flatId) {
      result = result.filter((a) => a.flatId === filters.flatId);
    }

    if (filters?.spaceId) {
      result = result.filter((a) => a.parkingSpaceId === filters.spaceId);
    }

    if (filters?.vehicleNumber) {
      const q = filters.vehicleNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
      result = result.filter((a) => a.vehicleNumber.includes(q));
    }

    return result.sort((a, b) => b.allocatedAt.getTime() - a.allocatedAt.getTime());
  }

  static getAuditLogs(): ParkingAuditLog[] {
    return [...auditLogsStore].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private static logAudit(data: Omit<ParkingAuditLog, 'id' | 'createdAt'>): void {
    auditLogsStore.push({
      id: `plog-${crypto.randomUUID()}`,
      createdAt: new Date(),
      ...data,
    });
  }
}
