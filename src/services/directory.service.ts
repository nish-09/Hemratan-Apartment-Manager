/**
 * HEMRATAN APARTMENT MANAGER — STAGE 5
 * Service Provider Directory & Domestic Help Attendance Service
 * 
 * Features:
 * - Verified Service Provider Directory with category filtering
 * - Privacy-preserving consent management & contact masking (+91 98XXX X4210)
 * - Consent withdrawal & profile management
 * - Multi-flat domestic worker authorization mapping
 * - Guard gate check-in & check-out with duplicate prevention
 * - Resident-relevant attendance queries with strict flat-level privacy isolation
 * - Contact access audit trail
 */

export type DirectoryCategory =
  | 'PLUMBER'
  | 'ELECTRICIAN'
  | 'HOUSEKEEPING'
  | 'DOMESTIC_HELP'
  | 'COOK'
  | 'MAID'
  | 'DRIVER'
  | 'CARPENTER'
  | 'PAINTER'
  | 'LIFT_MAINTENANCE'
  | 'SECURITY'
  | 'OTHER';

export type ServiceVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type DomesticServiceType = 'MAID' | 'COOK' | 'DRIVER' | 'BABYSITTER' | 'ELDERCARE' | 'CLEANER' | 'OTHER';

export interface ServiceProvider {
  id: string;
  fullName: string;
  category: DirectoryCategory;
  phoneNumber: string; // Plaintext for authorized storage
  maskedPhone: string; // e.g. +91 98XXX X4210 for public display
  profilePhotoPath?: string;
  bio?: string;
  languages: string;
  workingHours: string;
  verificationStatus: ServiceVerificationStatus;
  verificationNotes?: string;
  hasPoliceVerification: boolean;
  idProofType: string;
  idProofNumberMasked?: string;
  isListingActive: boolean;
  consentGivenAt: string;
  consentWithdrawnAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DomesticWorker {
  id: string;
  serviceProviderId?: string;
  fullName: string;
  serviceType: DomesticServiceType;
  phoneNumber: string;
  maskedPhone: string;
  profilePhotoPath?: string;
  emergencyContact?: string;
  isActive: boolean;
  authorizedFlats: string[]; // List of flat IDs (e.g. ['flat-a-402', 'flat-b-201'])
  isCurrentlyInside: boolean;
  activeAttendanceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlatStaffAuthorization {
  id: string;
  domesticStaffId: string;
  flatId: string;
  flatNumber: string;
  wing: string;
  authorizedByProfileId?: string;
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
  morningSlot: boolean;
  eveningSlot: boolean;
  notes?: string;
  createdAt: string;
}

export interface StaffAttendanceLog {
  id: string;
  domesticStaffId: string;
  staffName: string;
  serviceType: DomesticServiceType;
  authorizedFlatNumbers: string[];
  entryTime: string;
  entryGuardId: string;
  entryGate: string;
  exitTime?: string;
  exitGuardId?: string;
  status: 'INSIDE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
}

export interface ContactAccessLog {
  id: string;
  serviceProviderId: string;
  accessedByProfileId: string;
  accessedByUserName: string;
  accessedByFlatId?: string;
  reason: string;
  accessedAt: string;
}

// Seed service providers & domestic staff
const INITIAL_PROVIDERS: ServiceProvider[] = [
  {
    id: 'sp-001',
    fullName: 'Santosh Plumbing Services',
    category: 'PLUMBER',
    phoneNumber: '+91 98201 12345',
    maskedPhone: '+91 98XXX X2345',
    bio: '12 years experience in society high-pressure plumbing, pipeline joint leaks, and bathroom fittings.',
    languages: 'Hindi, Marathi',
    workingHours: '08:00 AM - 07:00 PM',
    verificationStatus: 'VERIFIED',
    hasPoliceVerification: true,
    idProofType: 'AADHAAR',
    idProofNumberMasked: 'XXXX-XXXX-4412',
    isListingActive: true,
    consentGivenAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sp-002',
    fullName: 'Dilip Sharma Electricals',
    category: 'ELECTRICIAN',
    phoneNumber: '+91 98202 23456',
    maskedPhone: '+91 98XXX X3456',
    bio: 'Govt. licensed wireman for distribution boards, MCB trippings, and inverter wirings.',
    languages: 'Hindi, Marathi, English',
    workingHours: '09:00 AM - 08:00 PM',
    verificationStatus: 'VERIFIED',
    hasPoliceVerification: true,
    idProofType: 'AADHAAR',
    idProofNumberMasked: 'XXXX-XXXX-8921',
    isListingActive: true,
    consentGivenAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sp-003',
    fullName: 'Kamla Bai (Housekeeping & Cleaning)',
    category: 'MAID',
    phoneNumber: '+91 98203 34567',
    maskedPhone: '+91 98XXX X4567',
    bio: 'Reliable domestic help, floor scrubbing, utensil washing, and dusting. Working in Wing A & B.',
    languages: 'Hindi, Marathi',
    workingHours: '07:00 AM - 01:00 PM, 05:00 PM - 08:00 PM',
    verificationStatus: 'VERIFIED',
    hasPoliceVerification: true,
    idProofType: 'AADHAAR',
    idProofNumberMasked: 'XXXX-XXXX-3110',
    isListingActive: true,
    consentGivenAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sp-004',
    fullName: 'Sunita Ben Cooking & Meals',
    category: 'COOK',
    phoneNumber: '+91 98204 45678',
    maskedPhone: '+91 98XXX X5678',
    bio: 'North Indian, Gujarati, and Jain home cooking specialist. Clean and hygienic prep.',
    languages: 'Gujarati, Hindi',
    workingHours: '06:30 AM - 10:00 AM, 05:30 PM - 09:00 PM',
    verificationStatus: 'VERIFIED',
    hasPoliceVerification: false,
    idProofType: 'VOTER_ID',
    idProofNumberMasked: 'XXX-XXX-901',
    isListingActive: true,
    consentGivenAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sp-005',
    fullName: 'Ramesh Sawant (Personal Driver)',
    category: 'DRIVER',
    phoneNumber: '+91 98205 56789',
    maskedPhone: '+91 98XXX X6789',
    bio: 'Professional automatic & manual car driver with clean driving record and valid commercial badge.',
    languages: 'Marathi, Hindi, English',
    workingHours: '08:00 AM - 08:00 PM',
    verificationStatus: 'VERIFIED',
    hasPoliceVerification: true,
    idProofType: 'DRIVING_LICENSE',
    idProofNumberMasked: 'MH-02-XXXX-99',
    isListingActive: true,
    consentGivenAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const INITIAL_STAFF_WORKERS: DomesticWorker[] = [
  {
    id: 'dw-001',
    serviceProviderId: 'sp-003',
    fullName: 'Kamla Bai',
    serviceType: 'MAID',
    phoneNumber: '+91 98203 34567',
    maskedPhone: '+91 98XXX X4567',
    isActive: true,
    authorizedFlats: ['flat-a-402', 'flat-b-201'],
    isCurrentlyInside: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'dw-002',
    serviceProviderId: 'sp-004',
    fullName: 'Sunita Ben',
    serviceType: 'COOK',
    phoneNumber: '+91 98204 45678',
    maskedPhone: '+91 98XXX X5678',
    isActive: true,
    authorizedFlats: ['flat-a-402', 'flat-c-304'],
    isCurrentlyInside: true,
    activeAttendanceId: 'att-sample-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'dw-003',
    serviceProviderId: 'sp-005',
    fullName: 'Ramesh Sawant',
    serviceType: 'DRIVER',
    phoneNumber: '+91 98205 56789',
    maskedPhone: '+91 98XXX X6789',
    isActive: true,
    authorizedFlats: ['flat-b-201'],
    isCurrentlyInside: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// In-memory data store
let providersStore: ServiceProvider[] = [...INITIAL_PROVIDERS];
let domesticStaffStore: DomesticWorker[] = [...INITIAL_STAFF_WORKERS];
let flatAuthorizationsStore: FlatStaffAuthorization[] = [
  {
    id: 'auth-1',
    domesticStaffId: 'dw-001',
    flatId: 'flat-a-402',
    flatNumber: '402',
    wing: 'A',
    status: 'APPROVED',
    morningSlot: true,
    eveningSlot: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'auth-2',
    domesticStaffId: 'dw-002',
    flatId: 'flat-a-402',
    flatNumber: '402',
    wing: 'A',
    status: 'APPROVED',
    morningSlot: true,
    eveningSlot: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'auth-3',
    domesticStaffId: 'dw-001',
    flatId: 'flat-b-201',
    flatNumber: '201',
    wing: 'B',
    status: 'APPROVED',
    morningSlot: true,
    eveningSlot: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

let attendanceStore: StaffAttendanceLog[] = [
  {
    id: 'att-sample-1',
    domesticStaffId: 'dw-002',
    staffName: 'Sunita Ben',
    serviceType: 'COOK',
    authorizedFlatNumbers: ['A-402', 'C-304'],
    entryTime: new Date(Date.now() - 7200000).toISOString(),
    entryGuardId: 'u-guard-001',
    entryGate: 'Gate 1 Main Access',
    status: 'INSIDE',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

let contactAccessLogsStore: ContactAccessLog[] = [];

export class DirectoryService {
  /**
   * Helper: Mask phone number for privacy
   */
  static maskPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.length < 8) return '+91 XXXXX XXXXX';
    // e.g. +91 98201 12345 -> +91 98XXX X2345
    const prefix = cleaned.slice(0, 5);
    const suffix = cleaned.slice(-4);
    return `${prefix} XXX ${suffix}`;
  }

  /**
   * List Verified Directory Service Providers
   * Respects worker consent (only returns active listings where consent is not withdrawn)
   */
  static getDirectory(filters?: {
    category?: DirectoryCategory;
    search?: string;
    verifiedOnly?: boolean;
  }): ServiceProvider[] {
    return providersStore
      .filter((p) => {
        // Must have active listing and valid consent
        if (!p.isListingActive || p.consentWithdrawnAt) return false;
        if (filters?.verifiedOnly && p.verificationStatus !== 'VERIFIED') return false;
        if (filters?.category && p.category !== filters.category) return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          const matchName = p.fullName.toLowerCase().includes(q);
          const matchBio = p.bio?.toLowerCase().includes(q) || false;
          const matchLang = p.languages.toLowerCase().includes(q);
          if (!matchName && !matchBio && !matchLang) return false;
        }
        return true;
      })
      .map((p) => ({
        ...p,
        // Plaintext phoneNumber is masked for general directory inquiries
        phoneNumber: p.maskedPhone,
      }));
  }

  /**
   * Access Contact Information with Explicit Resident Audit Logging
   */
  static accessProviderContact(input: {
    serviceProviderId: string;
    userProfileId: string;
    userName: string;
    flatId?: string;
    reason?: string;
  }): { fullPhoneNumber: string; auditLogId: string } {
    const provider = providersStore.find((p) => p.id === input.serviceProviderId);
    if (!provider) {
      throw new Error(`Service provider "${input.serviceProviderId}" not found.`);
    }

    if (!provider.isListingActive || provider.consentWithdrawnAt) {
      throw new Error('This service provider has withdrawn their listing from the society directory.');
    }

    const logId = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    contactAccessLogsStore.push({
      id: logId,
      serviceProviderId: provider.id,
      accessedByProfileId: input.userProfileId,
      accessedByUserName: input.userName,
      accessedByFlatId: input.flatId,
      reason: input.reason || 'RESIDENT_SERVICE_INQUIRY',
      accessedAt: new Date().toISOString(),
    });

    return {
      fullPhoneNumber: provider.phoneNumber,
      auditLogId: logId,
    };
  }

  /**
   * Worker-Controlled Consent Withdrawal / Listing Toggle
   */
  static setProviderConsent(
    serviceProviderId: string,
    isListingActive: boolean
  ): ServiceProvider {
    const provider = providersStore.find((p) => p.id === serviceProviderId);
    if (!provider) {
      throw new Error(`Service provider "${serviceProviderId}" not found.`);
    }

    const now = new Date().toISOString();
    provider.isListingActive = isListingActive;
    if (!isListingActive) {
      provider.consentWithdrawnAt = now;
    } else {
      provider.consentWithdrawnAt = undefined;
      provider.consentGivenAt = now;
    }
    provider.updatedAt = now;

    return provider;
  }

  /**
   * Register a New Domestic Worker (Gate/Resident Workflow)
   */
  static registerDomesticWorker(input: {
    fullName: string;
    serviceType: DomesticServiceType;
    phoneNumber: string;
    emergencyContact?: string;
    profilePhotoPath?: string;
    initialFlatId?: string;
  }): DomesticWorker {
    if (!input.fullName || input.fullName.trim().length < 3) {
      throw new Error('Full name must be at least 3 characters.');
    }
    if (!input.phoneNumber || input.phoneNumber.trim().length < 10) {
      throw new Error('Valid 10-digit mobile number is required.');
    }

    const now = new Date().toISOString();
    const id = `dw-${Date.now()}`;
    const maskedPhone = this.maskPhoneNumber(input.phoneNumber);

    const worker: DomesticWorker = {
      id,
      fullName: input.fullName.trim(),
      serviceType: input.serviceType,
      phoneNumber: input.phoneNumber.trim(),
      maskedPhone,
      emergencyContact: input.emergencyContact,
      profilePhotoPath: input.profilePhotoPath,
      isActive: true,
      authorizedFlats: input.initialFlatId ? [input.initialFlatId] : [],
      isCurrentlyInside: false,
      createdAt: now,
      updatedAt: now,
    };

    domesticStaffStore.unshift(worker);
    return worker;
  }

  /**
   * Authorize / Map Domestic Worker to a Flat
   */
  static authorizeFlat(input: {
    domesticStaffId: string;
    flatId: string;
    flatNumber: string;
    wing: string;
    authorizedByProfileId?: string;
    morningSlot?: boolean;
    eveningSlot?: boolean;
  }): FlatStaffAuthorization {
    const worker = domesticStaffStore.find((w) => w.id === input.domesticStaffId);
    if (!worker) {
      throw new Error(`Domestic staff "${input.domesticStaffId}" not found.`);
    }

    const existing = flatAuthorizationsStore.find(
      (a) => a.domesticStaffId === input.domesticStaffId && a.flatId === input.flatId
    );

    if (existing) {
      existing.status = 'APPROVED';
      existing.morningSlot = input.morningSlot ?? existing.morningSlot;
      existing.eveningSlot = input.eveningSlot ?? existing.eveningSlot;
      return existing;
    }

    const auth: FlatStaffAuthorization = {
      id: `auth-${Date.now()}`,
      domesticStaffId: input.domesticStaffId,
      flatId: input.flatId,
      flatNumber: input.flatNumber,
      wing: input.wing,
      authorizedByProfileId: input.authorizedByProfileId,
      status: 'APPROVED',
      morningSlot: input.morningSlot ?? true,
      eveningSlot: input.eveningSlot ?? true,
      createdAt: new Date().toISOString(),
    };

    flatAuthorizationsStore.push(auth);
    if (!worker.authorizedFlats.includes(input.flatId)) {
      worker.authorizedFlats.push(input.flatId);
    }

    return auth;
  }

  /**
   * Guard Gate Check-In (Entry Logging)
   * Prevents duplicate entry if worker is already inside.
   */
  static recordStaffCheckIn(input: {
    domesticStaffId: string;
    guardId: string;
    gateName?: string;
    notes?: string;
  }): StaffAttendanceLog {
    const worker = domesticStaffStore.find((w) => w.id === input.domesticStaffId);
    if (!worker) {
      throw new Error(`Domestic worker with ID "${input.domesticStaffId}" not found.`);
    }

    if (!worker.isActive) {
      throw new Error(`Cannot check in inactive staff member "${worker.fullName}".`);
    }

    if (worker.isCurrentlyInside) {
      throw new Error(`Worker "${worker.fullName}" is already checked in and inside the society.`);
    }

    const now = new Date().toISOString();
    const logId = `att-${Date.now()}`;

    // Get flat numbers authorized for this worker
    const flatNums = flatAuthorizationsStore
      .filter((a) => a.domesticStaffId === worker.id && a.status === 'APPROVED')
      .map((a) => `${a.wing}-${a.flatNumber}`);

    const log: StaffAttendanceLog = {
      id: logId,
      domesticStaffId: worker.id,
      staffName: worker.fullName,
      serviceType: worker.serviceType,
      authorizedFlatNumbers: flatNums.length > 0 ? flatNums : ['General Staff'],
      entryTime: now,
      entryGuardId: input.guardId,
      entryGate: input.gateName || 'Gate 1 Main Access',
      status: 'INSIDE',
      notes: input.notes,
      createdAt: now,
    };

    attendanceStore.unshift(log);

    // Update worker state
    worker.isCurrentlyInside = true;
    worker.activeAttendanceId = logId;
    worker.updatedAt = now;

    return log;
  }

  /**
   * Guard Gate Check-Out (Exit Logging)
   * Releases worker and completes attendance record.
   */
  static recordStaffCheckOut(input: {
    domesticStaffId: string;
    guardId: string;
    notes?: string;
  }): StaffAttendanceLog {
    const worker = domesticStaffStore.find((w) => w.id === input.domesticStaffId);
    if (!worker) {
      throw new Error(`Domestic worker "${input.domesticStaffId}" not found.`);
    }

    if (!worker.isCurrentlyInside || !worker.activeAttendanceId) {
      throw new Error(`Worker "${worker.fullName}" is not currently checked in.`);
    }

    const log = attendanceStore.find((a) => a.id === worker.activeAttendanceId);
    if (!log) {
      throw new Error(`Attendance record "${worker.activeAttendanceId}" not found.`);
    }

    const now = new Date().toISOString();
    log.exitTime = now;
    log.exitGuardId = input.guardId;
    log.status = 'COMPLETED';
    if (input.notes) {
      log.notes = log.notes ? `${log.notes}; Exit: ${input.notes}` : input.notes;
    }

    // Update worker state
    worker.isCurrentlyInside = false;
    worker.activeAttendanceId = undefined;
    worker.updatedAt = now;

    return log;
  }

  /**
   * Get Active Domestic Staff Currently Inside Society (Guard Overview)
   */
  static getActiveStaffInside(): StaffAttendanceLog[] {
    return attendanceStore.filter((a) => a.status === 'INSIDE');
  }

  /**
   * Get Domestic Staff & Attendance for a Resident's Flat (Strict Flat Isolation)
   */
  static getDomesticStaffForResident(flatId: string): {
    workers: DomesticWorker[];
    recentAttendance: StaffAttendanceLog[];
  } {
    // 1. Get staff authorized for this flat
    const authorizedStaffIds = flatAuthorizationsStore
      .filter((a) => a.flatId === flatId && a.status === 'APPROVED')
      .map((a) => a.domesticStaffId);

    const workers = domesticStaffStore.filter((w) => authorizedStaffIds.includes(w.id));

    // 2. Get attendance records only for these authorized workers
    const recentAttendance = attendanceStore.filter((a) =>
      authorizedStaffIds.includes(a.domesticStaffId)
    );

    return { workers, recentAttendance };
  }

  /**
   * Committee: Verify / Reject Service Provider
   */
  static verifyServiceProvider(
    serviceProviderId: string,
    status: ServiceVerificationStatus,
    notes?: string,
    policeVerification?: boolean
  ): ServiceProvider {
    const provider = providersStore.find((p) => p.id === serviceProviderId);
    if (!provider) {
      throw new Error(`Provider "${serviceProviderId}" not found.`);
    }

    provider.verificationStatus = status;
    provider.verificationNotes = notes;
    if (policeVerification !== undefined) {
      provider.hasPoliceVerification = policeVerification;
    }
    provider.updatedAt = new Date().toISOString();

    return provider;
  }

  /**
   * All Domestic Staff list (Guard / Committee view)
   */
  static getAllDomesticStaff(): DomesticWorker[] {
    return [...domesticStaffStore];
  }

  /**
   * Test reset
   */
  static _resetForTesting() {
    providersStore = [...INITIAL_PROVIDERS];
    domesticStaffStore = [...INITIAL_STAFF_WORKERS];
    flatAuthorizationsStore = [
      {
        id: 'auth-1',
        domesticStaffId: 'dw-001',
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        status: 'APPROVED',
        morningSlot: true,
        eveningSlot: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'auth-2',
        domesticStaffId: 'dw-002',
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        status: 'APPROVED',
        morningSlot: true,
        eveningSlot: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'auth-3',
        domesticStaffId: 'dw-001',
        flatId: 'flat-b-201',
        flatNumber: '201',
        wing: 'B',
        status: 'APPROVED',
        morningSlot: true,
        eveningSlot: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    attendanceStore = [
      {
        id: 'att-sample-1',
        domesticStaffId: 'dw-002',
        staffName: 'Sunita Ben',
        serviceType: 'COOK',
        authorizedFlatNumbers: ['A-402', 'C-304'],
        entryTime: '2026-11-02T08:00:00.000Z',
        entryGuardId: 'u-guard-001',
        entryGate: 'Gate 1 Main Access',
        status: 'INSIDE',
        createdAt: '2026-11-02T08:00:00.000Z',
      },
    ];
    contactAccessLogsStore = [];
  }
}
