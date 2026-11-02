/**
 * HEMRATAN APARTMENT MANAGER — STAGE 4
 * Complaint Management & Task Assignment Service
 * 
 * Features:
 * - Deterministic, explainable priority scoring (Severity 40%, Urgency 25%, Flats 20%, Recurrence 10%, Damage 5%)
 * - Safety overrides (Fire, Electrical emergency, Lift entrapment, Structural emergency) forcing Critical
 * - Anonymous complaint separation via private identity mapping (Super Admin access only with audit log)
 * - Committee priority override with mandatory justification and audit logging
 * - Task creation and assignment to active staff with configurable strategy
 * - Deterministic ETA calculation engine with mandatory committee confirmation
 * - Reopen workflow, progress updates, and resident feedback rating
 */

export type ComplaintCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'LIFT'
  | 'HOUSEKEEPING'
  | 'SECURITY'
  | 'PARKING'
  | 'NOISE'
  | 'STRUCTURAL'
  | 'AMENITIES'
  | 'OTHER';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SafetyOverrideType =
  | 'FIRE_EMERGENCY'
  | 'ELECTRICAL_HAZARD'
  | 'LIFT_ENTRAPMENT'
  | 'STRUCTURAL_COLLAPSE_RISK';

export type ComplaintStatus =
  | 'OPEN'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

export type TaskStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED';

export interface PriorityBreakdown {
  score: number;
  priorityBand: PriorityLevel;
  safetyOverrideTriggered: boolean;
  safetyOverrideType?: SafetyOverrideType;
  factors: {
    severityPoints: number; // Max 40
    urgencyPoints: number; // Max 25
    affectedFlatsPoints: number; // Max 20
    recurrencePoints: number; // Max 10
    propertyDamagePoints: number; // Max 5
  };
  explanation: string;
}

export interface ComplaintMediaInput {
  fileType: 'IMAGE' | 'VIDEO';
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface StoredMedia {
  id: string;
  fileType: 'IMAGE' | 'VIDEO';
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  sanitizedFileName: string;
}

export interface SubmitComplaintInput {
  title: string;
  description: string;
  category: ComplaintCategory;
  severity: SeverityLevel;
  urgency: UrgencyLevel;
  affectedFlatsCount?: number;
  propertyDamage?: boolean;
  recurrence?: boolean;
  safetyOverrideType?: SafetyOverrideType;
  isAnonymous?: boolean;
  flatId?: string;
  complainantProfileId: string;
  complainantName: string;
  media?: ComplaintMediaInput[];
}

export interface Complaint {
  id: string;
  referenceNo: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  flatId?: string;
  flatNumber?: string;
  wing?: string;
  isAnonymous: boolean;
  severity: SeverityLevel;
  urgency: UrgencyLevel;
  affectedFlatsCount: number;
  propertyDamage: boolean;
  recurrence: boolean;
  safetyOverrideTriggered: boolean;
  safetyOverrideType?: SafetyOverrideType;
  computedScore: number;
  priorityBand: PriorityLevel;
  priorityExplanation: PriorityBreakdown;
  committeePriority?: PriorityLevel;
  effectivePriority: PriorityLevel;
  status: ComplaintStatus;
  confirmedEta?: string;
  confirmedEtaBy?: string;
  createdByProfileId?: string;
  createdByName?: string;
  reopenedCount: number;
  reopenedReason?: string;
  media: StoredMedia[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ComplaintIdentityMapping {
  id: string;
  complaintId: string;
  referenceNo: string;
  realComplainantId: string;
  realComplainantName: string;
  realFlatId?: string;
  accessAuditLog: Array<{
    accessedBy: string;
    accessedAt: string;
    reason: string;
  }>;
  createdAt: string;
}

export interface ComplaintTask {
  id: string;
  complaintId: string;
  complaintReferenceNo: string;
  title: string;
  description?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedStaffRole?: string;
  assignedCommitteeId?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  dueDate?: string;
  estimatedDurationHours: number;
  eta?: string;
  etaStatus: 'PROPOSED' | 'CONFIRMED' | 'REVISED';
  internalNotes?: string;
  resolutionNotes?: string;
  progressUpdates: Array<{
    id: string;
    updatedBy: string;
    statusUpdate: string;
    notes: string;
    evidencePhotoPath?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ComplaintFeedback {
  id: string;
  complaintId: string;
  rating: number; // 1-5
  feedbackComments?: string;
  submittedAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  skills: ComplaintCategory[];
  isActive: boolean;
  activeTaskCount: number;
}

// In-memory data store for testing and fallback
let complaintsStore: Complaint[] = [];
let identityMappingsStore: ComplaintIdentityMapping[] = [];
let tasksStore: ComplaintTask[] = [];
let feedbackStore: ComplaintFeedback[] = [];
let priorityHistoryStore: Array<{
  id: string;
  complaintId: string;
  previousPriority: PriorityLevel;
  newPriority: PriorityLevel;
  overrideReason: string;
  overriddenBy: string;
  createdAt: string;
}> = [];

// Seed operational staff
export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-001',
    name: 'Santosh Yadav',
    role: 'Security & Access Control',
    skills: ['SECURITY', 'PARKING', 'NOISE'],
    isActive: true,
    activeTaskCount: 1,
  },
  {
    id: 'staff-002',
    name: 'Ramesh Plumber',
    role: 'Society Plumber',
    skills: ['PLUMBING', 'STRUCTURAL'],
    isActive: true,
    activeTaskCount: 2,
  },
  {
    id: 'staff-003',
    name: 'Dilip Electrician',
    role: 'Society Electrician',
    skills: ['ELECTRICAL', 'LIFT'],
    isActive: true,
    activeTaskCount: 0,
  },
  {
    id: 'staff-004',
    name: 'Anita Housekeeping',
    role: 'Housekeeping Lead',
    skills: ['HOUSEKEEPING', 'AMENITIES', 'OTHER'],
    isActive: true,
    activeTaskCount: 1,
  },
  {
    id: 'staff-005',
    name: 'Vikas Inactive',
    role: 'Contractor (Relieved)',
    skills: ['PLUMBING'],
    isActive: false,
    activeTaskCount: 0,
  },
];

export class ComplaintService {
  /**
   * Deterministic Priority Calculation
   * Exact Weights:
   * - Severity: 40 points (CRITICAL: 40, HIGH: 28, MEDIUM: 16, LOW: 5)
   * - Urgency: 25 points (CRITICAL: 25, HIGH: 18, MEDIUM: 10, LOW: 4)
   * - Affected Flats: 20 points (10+: 20, 5-9: 15, 2-4: 10, 1: 4)
   * - Recurrence: 10 points (true: 10, false: 0)
   * - Property Damage: 5 points (true: 5, false: 0)
   * Maximum: 100 points
   * Bands: Critical: 85-100, High: 65-84, Medium: 35-64, Low: 0-34
   * 
   * Safety Overrides: Fire, Electrical emergency, Lift entrapment, Structural emergency force Critical (100)
   */
  static calculatePriority(input: {
    severity: SeverityLevel;
    urgency: UrgencyLevel;
    affectedFlatsCount?: number;
    propertyDamage?: boolean;
    recurrence?: boolean;
    safetyOverrideType?: SafetyOverrideType;
    category?: ComplaintCategory;
    title?: string;
    description?: string;
  }): PriorityBreakdown {
    // 1. Check Safety Overrides first
    let safetyTriggered = false;
    let overrideType = input.safetyOverrideType;

    // Detect keyword safety emergency if not explicitly set
    if (!overrideType) {
      const text = `${input.title || ''} ${input.description || ''}`.toLowerCase();
      if (input.category === 'ELECTRICAL' || text.includes('electric shock') || text.includes('sparking') || text.includes('short circuit') || text.includes('exposed wire')) {
        overrideType = 'ELECTRICAL_HAZARD';
      } else if (text.includes('lift entrap') || text.includes('stuck in lift') || (input.category === 'LIFT' && text.includes('trapped'))) {
        overrideType = 'LIFT_ENTRAPMENT';
      } else if (text.includes('structural crack') || text.includes('slab collapse') || text.includes('ceiling falling')) {
        overrideType = 'STRUCTURAL_COLLAPSE_RISK';
      } else if (text.includes('fire') || text.includes('gas leak') || text.includes('smoke')) {
        overrideType = 'FIRE_EMERGENCY';
      }
    }

    if (overrideType) {
      safetyTriggered = true;
    }

    // 2. Factor: Severity (Max 40 points)
    const severityPointsMap: Record<SeverityLevel, number> = {
      CRITICAL: 40,
      HIGH: 28,
      MEDIUM: 16,
      LOW: 5,
    };
    const severityPoints = severityPointsMap[input.severity] ?? 16;

    // 3. Factor: Urgency (Max 25 points)
    const urgencyPointsMap: Record<UrgencyLevel, number> = {
      CRITICAL: 25,
      HIGH: 18,
      MEDIUM: 10,
      LOW: 4,
    };
    const urgencyPoints = urgencyPointsMap[input.urgency] ?? 10;

    // 4. Factor: Affected Flats (Max 20 points)
    const count = input.affectedFlatsCount ?? 1;
    let affectedFlatsPoints = 4;
    if (count >= 10) {
      affectedFlatsPoints = 20;
    } else if (count >= 5) {
      affectedFlatsPoints = 15;
    } else if (count >= 2) {
      affectedFlatsPoints = 10;
    }

    // 5. Factor: Recurrence (Max 10 points)
    const recurrencePoints = input.recurrence ? 10 : 0;

    // 6. Factor: Property Damage (Max 5 points)
    const propertyDamagePoints = input.propertyDamage ? 5 : 0;

    // Sum total
    const rawScore = severityPoints + urgencyPoints + affectedFlatsPoints + recurrencePoints + propertyDamagePoints;
    const computedScore = Math.min(100, Math.max(0, rawScore));

    // Determine band from score
    let priorityBand: PriorityLevel = 'LOW';
    if (computedScore >= 85) {
      priorityBand = 'CRITICAL';
    } else if (computedScore >= 65) {
      priorityBand = 'HIGH';
    } else if (computedScore >= 35) {
      priorityBand = 'MEDIUM';
    } else {
      priorityBand = 'LOW';
    }

    // Safety override forces CRITICAL
    if (safetyTriggered) {
      return {
        score: Math.max(computedScore, 95),
        priorityBand: 'CRITICAL',
        safetyOverrideTriggered: true,
        safetyOverrideType: overrideType,
        factors: {
          severityPoints,
          urgencyPoints,
          affectedFlatsPoints,
          recurrencePoints,
          propertyDamagePoints,
        },
        explanation: `FORCED CRITICAL: Safety override activated (${overrideType?.replace(/_/g, ' ')}). Requires immediate security & technician dispatch regardless of base score (${computedScore}/100).`,
      };
    }

    return {
      score: computedScore,
      priorityBand,
      safetyOverrideTriggered: false,
      factors: {
        severityPoints,
        urgencyPoints,
        affectedFlatsPoints,
        recurrencePoints,
        propertyDamagePoints,
      },
      explanation: `Deterministic score: ${computedScore}/100 [Severity: ${severityPoints}/40, Urgency: ${urgencyPoints}/25, Flats: ${affectedFlatsPoints}/20, Recurrence: ${recurrencePoints}/10, Damage: ${propertyDamagePoints}/5] -> Band: ${priorityBand}`,
    };
  }

  /**
   * Validate and Sanitize Complaint Media
   */
  static validateMedia(mediaList?: ComplaintMediaInput[]): StoredMedia[] {
    if (!mediaList || mediaList.length === 0) return [];

    const stored: StoredMedia[] = [];

    for (let i = 0; i < mediaList.length; i++) {
      const item = mediaList[i];
      if (item.fileType === 'IMAGE') {
        if (item.fileSizeBytes > 10 * 1024 * 1024) {
          throw new Error(`Image attachment "${item.originalFileName}" exceeds 10 MB maximum limit.`);
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(item.mimeType.toLowerCase())) {
          throw new Error(`Invalid image type for "${item.originalFileName}". Only JPEG, PNG, and WebP are allowed.`);
        }
      } else if (item.fileType === 'VIDEO') {
        if (item.fileSizeBytes > 50 * 1024 * 1024) {
          throw new Error(`Video attachment "${item.originalFileName}" exceeds 50 MB maximum limit.`);
        }
        if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(item.mimeType.toLowerCase())) {
          throw new Error(`Invalid video type for "${item.originalFileName}". Only MP4, WebM, and MOV are allowed.`);
        }
      } else {
        throw new Error(`Unsupported media type: ${item.fileType}`);
      }

      // Generate sanitized, identity-safe filename
      const ext = item.originalFileName.split('.').pop() || 'bin';
      const sanitizedName = `complaint_evidence_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

      stored.push({
        id: `media-${Date.now()}-${i}`,
        fileType: item.fileType,
        filePath: `complaints/${sanitizedName}`,
        fileSizeBytes: item.fileSizeBytes,
        mimeType: item.mimeType,
        sanitizedFileName: sanitizedName,
      });
    }

    return stored;
  }

  /**
   * Submit a new Complaint (Resident Workflow)
   */
  static async submitComplaint(input: SubmitComplaintInput): Promise<Complaint> {
    if (!input.title || input.title.trim().length < 5) {
      throw new Error('Complaint title must be at least 5 characters long.');
    }
    if (!input.description || input.description.trim().length < 10) {
      throw new Error('Complaint description must be at least 10 characters long.');
    }
    if (!input.complainantProfileId) {
      throw new Error('Complainant profile ID is required for authentication.');
    }

    const priorityInfo = this.calculatePriority({
      severity: input.severity,
      urgency: input.urgency,
      affectedFlatsCount: input.affectedFlatsCount,
      propertyDamage: input.propertyDamage,
      recurrence: input.recurrence,
      safetyOverrideType: input.safetyOverrideType,
      category: input.category,
      title: input.title,
      description: input.description,
    });

    const validatedMedia = this.validateMedia(input.media);

    const now = new Date().toISOString();
    const referenceNo = `CMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const complaintId = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const isAnon = Boolean(input.isAnonymous);

    // If anonymous, complainant profile and flat are excluded from public complaint record
    const newComplaint: Complaint = {
      id: complaintId,
      referenceNo,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      flatId: isAnon ? undefined : input.flatId,
      isAnonymous: isAnon,
      severity: input.severity,
      urgency: input.urgency,
      affectedFlatsCount: input.affectedFlatsCount ?? 1,
      propertyDamage: Boolean(input.propertyDamage),
      recurrence: Boolean(input.recurrence),
      safetyOverrideTriggered: priorityInfo.safetyOverrideTriggered,
      safetyOverrideType: priorityInfo.safetyOverrideType,
      computedScore: priorityInfo.score,
      priorityBand: priorityInfo.priorityBand,
      priorityExplanation: priorityInfo,
      effectivePriority: priorityInfo.priorityBand,
      status: 'OPEN',
      createdByProfileId: isAnon ? undefined : input.complainantProfileId,
      createdByName: isAnon ? 'Anonymous Resident' : input.complainantName,
      reopenedCount: 0,
      media: validatedMedia,
      createdAt: now,
      updatedAt: now,
    };

    complaintsStore.unshift(newComplaint);

    // If anonymous, persist mapping in private identity table
    if (isAnon) {
      identityMappingsStore.push({
        id: `map-${Date.now()}`,
        complaintId: newComplaint.id,
        referenceNo: newComplaint.referenceNo,
        realComplainantId: input.complainantProfileId,
        realComplainantName: input.complainantName,
        realFlatId: input.flatId,
        accessAuditLog: [],
        createdAt: now,
      });
    }

    return newComplaint;
  }

  /**
   * Committee Priority Override
   * Mandatory reason required. Preserves original automated score in audit trail.
   */
  static async overridePriority(
    complaintId: string,
    newPriority: PriorityLevel,
    reason: string,
    overriddenByUserId: string
  ): Promise<Complaint> {
    const complaint = complaintsStore.find((c) => c.id === complaintId);
    if (!complaint) {
      throw new Error(`Complaint with ID "${complaintId}" not found.`);
    }

    if (!reason || reason.trim().length < 8) {
      throw new Error('A mandatory justification of at least 8 characters is required to override automated priority.');
    }

    const previousPriority = complaint.effectivePriority;
    complaint.committeePriority = newPriority;
    complaint.effectivePriority = newPriority;
    complaint.status = complaint.status === 'OPEN' ? 'TRIAGED' : complaint.status;
    complaint.updatedAt = new Date().toISOString();

    // Record audit trail
    priorityHistoryStore.push({
      id: `ovr-${Date.now()}`,
      complaintId: complaint.id,
      previousPriority,
      newPriority,
      overrideReason: reason.trim(),
      overriddenBy: overriddenByUserId,
      createdAt: new Date().toISOString(),
    });

    return complaint;
  }

  /**
   * Deterministic ETA Engine
   */
  static calculateEstimatedResolutionTime(
    priority: PriorityLevel,
    category: ComplaintCategory,
    staffWorkload = 0
  ): { hours: number; proposedEta: Date } {
    let baseHours = 48;

    switch (priority) {
      case 'CRITICAL':
        baseHours = 3; // 3 hours
        break;
      case 'HIGH':
        baseHours = 12; // 12 hours
        break;
      case 'MEDIUM':
        baseHours = 36; // 36 hours
        break;
      case 'LOW':
        baseHours = 72; // 3 days
        break;
    }

    // Category modifiers
    if (category === 'LIFT' || category === 'ELECTRICAL') {
      baseHours = Math.max(2, baseHours * 0.75); // Fast-tracked
    } else if (category === 'STRUCTURAL') {
      baseHours = baseHours * 1.5; // Requires engineering assessment
    }

    // Workload modifier: each active task adds 2 hours
    const workloadDelay = staffWorkload * 2;
    const totalHours = Math.round((baseHours + workloadDelay) * 10) / 10;

    const proposedEta = new Date(Date.now() + totalHours * 3600 * 1000);
    return { hours: totalHours, proposedEta };
  }

  /**
   * Task Assignment Workflow
   */
  static async assignTask(input: {
    complaintId: string;
    title: string;
    description?: string;
    assignedStaffId: string;
    assignedCommitteeId?: string;
    priority?: PriorityLevel;
    dueDate?: string;
    strategy?: 'MANUAL' | 'AUTO' | 'HYBRID';
  }): Promise<ComplaintTask> {
    const complaint = complaintsStore.find((c) => c.id === input.complaintId);
    if (!complaint) {
      throw new Error(`Complaint "${input.complaintId}" not found.`);
    }

    // Validate staff member exists and is active
    const staff = INITIAL_STAFF.find((s) => s.id === input.assignedStaffId);
    if (!staff) {
      throw new Error(`Staff member "${input.assignedStaffId}" does not exist.`);
    }
    if (!staff.isActive) {
      throw new Error(`Cannot assign task to inactive staff member "${staff.name}".`);
    }

    const priority = input.priority || complaint.effectivePriority;
    const { hours, proposedEta } = this.calculateEstimatedResolutionTime(
      priority,
      complaint.category,
      staff.activeTaskCount
    );

    const taskId = `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const task: ComplaintTask = {
      id: taskId,
      complaintId: complaint.id,
      complaintReferenceNo: complaint.referenceNo,
      title: input.title || `Resolve: ${complaint.title}`,
      description: input.description || complaint.description,
      assignedStaffId: staff.id,
      assignedStaffName: staff.name,
      assignedStaffRole: staff.role,
      assignedCommitteeId: input.assignedCommitteeId,
      priority,
      status: 'ASSIGNED',
      estimatedDurationHours: hours,
      eta: proposedEta.toISOString(),
      etaStatus: 'PROPOSED',
      dueDate: input.dueDate || proposedEta.toISOString(),
      progressUpdates: [],
      createdAt: now,
      updatedAt: now,
    };

    tasksStore.unshift(task);

    // Update staff active count
    staff.activeTaskCount += 1;

    // Transition complaint status to ASSIGNED
    complaint.status = 'ASSIGNED';
    complaint.updatedAt = now;

    return task;
  }

  /**
   * Confirm Official ETA (Mandatory Committee Confirmation)
   */
  static async confirmETA(
    complaintId: string,
    confirmedEtaDate: string,
    confirmedByUserId: string,
    notes?: string
  ): Promise<Complaint> {
    const complaint = complaintsStore.find((c) => c.id === complaintId);
    if (!complaint) {
      throw new Error(`Complaint "${complaintId}" not found.`);
    }

    const etaDate = new Date(confirmedEtaDate);
    if (isNaN(etaDate.getTime())) {
      throw new Error('Invalid ETA date provided.');
    }

    complaint.confirmedEta = etaDate.toISOString();
    complaint.confirmedEtaBy = confirmedByUserId;
    complaint.updatedAt = new Date().toISOString();

    // Update associated task ETA to CONFIRMED
    const task = tasksStore.find((t) => t.complaintId === complaintId);
    if (task) {
      task.eta = etaDate.toISOString();
      task.etaStatus = 'CONFIRMED';
      if (notes) {
        task.internalNotes = task.internalNotes ? `${task.internalNotes}\nETA confirmed: ${notes}` : `ETA confirmed: ${notes}`;
      }
      task.updatedAt = new Date().toISOString();
    }

    return complaint;
  }

  /**
   * Update Task Progress (Staff / Guard Workflow)
   */
  static async updateTaskProgress(
    taskId: string,
    input: {
      statusUpdate: TaskStatus;
      notes: string;
      updatedByUserId: string;
      evidencePhotoPath?: string;
      resolutionNotes?: string;
    }
  ): Promise<ComplaintTask> {
    const task = tasksStore.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task with ID "${taskId}" not found.`);
    }

    if (!input.notes || input.notes.trim().length < 5) {
      throw new Error('A progress note of at least 5 characters is required.');
    }

    const now = new Date().toISOString();
    task.status = input.statusUpdate;
    task.updatedAt = now;

    task.progressUpdates.push({
      id: `prog-${Date.now()}`,
      updatedBy: input.updatedByUserId,
      statusUpdate: input.statusUpdate,
      notes: input.notes.trim(),
      evidencePhotoPath: input.evidencePhotoPath,
      createdAt: now,
    });

    if (input.resolutionNotes) {
      task.resolutionNotes = input.resolutionNotes;
    }

    // Mirror status on complaint
    const complaint = complaintsStore.find((c) => c.id === task.complaintId);
    if (complaint) {
      if (input.statusUpdate === 'RESOLVED') {
        task.resolvedAt = now;
        complaint.status = 'RESOLVED';
        complaint.resolvedAt = now;

        // Decrement staff active task count
        const staff = INITIAL_STAFF.find((s) => s.id === task.assignedStaffId);
        if (staff && staff.activeTaskCount > 0) {
          staff.activeTaskCount -= 1;
        }
      } else if (input.statusUpdate === 'IN_PROGRESS') {
        complaint.status = 'IN_PROGRESS';
      } else if (input.statusUpdate === 'ON_HOLD') {
        complaint.status = 'ON_HOLD';
      }
      complaint.updatedAt = now;
    }

    return task;
  }

  /**
   * Reopen Complaint (Resident Workflow)
   */
  static async reopenComplaint(
    complaintId: string,
    reason: string,
    reopenedByUserId: string
  ): Promise<Complaint> {
    const complaint = complaintsStore.find((c) => c.id === complaintId);
    if (!complaint) {
      throw new Error(`Complaint "${complaintId}" not found.`);
    }

    if (complaint.status !== 'RESOLVED' && complaint.status !== 'CLOSED') {
      throw new Error('Only RESOLVED or CLOSED complaints can be reopened.');
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error('A valid reason of at least 10 characters is required to reopen a complaint.');
    }

    complaint.status = 'REOPENED';
    complaint.reopenedCount += 1;
    complaint.reopenedReason = reason.trim();
    complaint.resolvedAt = undefined;
    complaint.updatedAt = new Date().toISOString();

    return complaint;
  }

  /**
   * Submit Resident Feedback
   */
  static async submitFeedback(
    complaintId: string,
    rating: number,
    feedbackComments?: string
  ): Promise<ComplaintFeedback> {
    const complaint = complaintsStore.find((c) => c.id === complaintId);
    if (!complaint) {
      throw new Error(`Complaint "${complaintId}" not found.`);
    }

    if (complaint.status !== 'RESOLVED' && complaint.status !== 'CLOSED') {
      throw new Error('Feedback can only be submitted for resolved complaints.');
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5 stars.');
    }

    const existing = feedbackStore.find((f) => f.complaintId === complaintId);
    if (existing) {
      throw new Error('Feedback has already been submitted for this complaint.');
    }

    const feedback: ComplaintFeedback = {
      id: `fb-${Date.now()}`,
      complaintId,
      rating,
      feedbackComments: feedbackComments?.trim(),
      submittedAt: new Date().toISOString(),
    };

    feedbackStore.push(feedback);
    return feedback;
  }

  /**
   * Get Complaints for Resident (Strict Flat & Complainant Isolation)
   */
  static async getComplaintsForResident(userProfileId: string, userFlatIds: string[]): Promise<Complaint[]> {
    // Collect complaint IDs from anonymous mappings belonging to this resident
    const myAnonymousComplaintIds = identityMappingsStore
      .filter((m) => m.realComplainantId === userProfileId)
      .map((m) => m.complaintId);

    return complaintsStore.filter((c) => {
      // 1. Complaint submitted directly by this resident
      if (c.createdByProfileId === userProfileId) return true;
      // 2. Complaint attached to one of the resident's authorized flats
      if (c.flatId && userFlatIds.includes(c.flatId)) return true;
      // 3. Anonymous complaint submitted by this resident
      if (myAnonymousComplaintIds.includes(c.id)) return true;
      return false;
    });
  }

  /**
   * Get Complaints for Committee (Society-Wide, Anonymous Identities Strictly Redacted)
   */
  static async getComplaintsForCommittee(): Promise<Complaint[]> {
    // Return all complaints, ensuring anonymous complaints have zero complainant leaks
    return complaintsStore.map((c) => {
      if (c.isAnonymous) {
        return {
          ...c,
          createdByProfileId: undefined,
          createdByName: 'Anonymous Resident',
          flatId: undefined,
          flatNumber: undefined,
          wing: undefined,
        };
      }
      return c;
    });
  }

  /**
   * Super Admin Exclusive: Reveal Anonymous Complainant with Mandatory Audit Log
   */
  static async revealAnonymousIdentity(
    complaintId: string,
    superAdminUserId: string,
    legalReason: string
  ): Promise<{ complainantId: string; complainantName: string; flatId?: string }> {
    const mapping = identityMappingsStore.find((m) => m.complaintId === complaintId);
    if (!mapping) {
      throw new Error(`Anonymous identity mapping for complaint "${complaintId}" not found.`);
    }

    if (!legalReason || legalReason.trim().length < 15) {
      throw new Error('A mandatory legal/operational justification (min 15 characters) is required to reveal an anonymous complainant.');
    }

    // Append to audit log
    mapping.accessAuditLog.push({
      accessedBy: superAdminUserId,
      accessedAt: new Date().toISOString(),
      reason: legalReason.trim(),
    });

    return {
      complainantId: mapping.realComplainantId,
      complainantName: mapping.realComplainantName,
      flatId: mapping.realFlatId,
    };
  }

  /**
   * Society-wide Operational Metrics
   */
  static getMetrics() {
    const total = complaintsStore.length;
    const critical = complaintsStore.filter((c) => c.effectivePriority === 'CRITICAL').length;
    const high = complaintsStore.filter((c) => c.effectivePriority === 'HIGH').length;
    const open = complaintsStore.filter((c) => c.status === 'OPEN').length;
    const inProgress = complaintsStore.filter((c) => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length;
    const resolved = complaintsStore.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
    const overdueTasks = tasksStore.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;

    return {
      total,
      critical,
      high,
      open,
      inProgress,
      resolved,
      overdueTasks,
      activeTasks: tasksStore.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length,
    };
  }

  /**
   * Test helper to reset in-memory state
   */
  static _resetForTesting() {
    complaintsStore = [];
    identityMappingsStore = [];
    tasksStore = [];
    feedbackStore = [];
    priorityHistoryStore = [];
  }
}
