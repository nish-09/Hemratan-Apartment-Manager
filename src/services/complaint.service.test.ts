import { describe, it, expect, beforeEach } from 'vitest';
import { ComplaintService, INITIAL_STAFF } from './complaint.service';

describe('ComplaintService (Stage 4 Unit Tests)', () => {
  beforeEach(() => {
    ComplaintService._resetForTesting();
  });

  describe('1. Deterministic Priority Scoring Engine', () => {
    it('calculates Low priority correctly for routine, isolated issues', () => {
      const res = ComplaintService.calculatePriority({
        severity: 'LOW', // 5
        urgency: 'LOW', // 4
        affectedFlatsCount: 1, // 4
        recurrence: false, // 0
        propertyDamage: false, // 0
      });

      expect(res.score).toBe(13); // 5 + 4 + 4 + 0 + 0 = 13
      expect(res.priorityBand).toBe('LOW');
      expect(res.safetyOverrideTriggered).toBe(false);
      expect(res.explanation).toContain('Band: LOW');
    });

    it('calculates Medium priority correctly', () => {
      const res = ComplaintService.calculatePriority({
        severity: 'MEDIUM', // 16
        urgency: 'MEDIUM', // 10
        affectedFlatsCount: 3, // 10 (2-4 flats)
        recurrence: true, // 10
        propertyDamage: false, // 0
      });

      expect(res.score).toBe(46); // 16 + 10 + 10 + 10 + 0 = 46
      expect(res.priorityBand).toBe('MEDIUM');
      expect(res.factors.severityPoints).toBe(16);
      expect(res.factors.urgencyPoints).toBe(10);
      expect(res.factors.affectedFlatsPoints).toBe(10);
      expect(res.factors.recurrencePoints).toBe(10);
    });

    it('calculates High priority correctly (65-84)', () => {
      const res = ComplaintService.calculatePriority({
        severity: 'HIGH', // 28
        urgency: 'HIGH', // 18
        affectedFlatsCount: 6, // 15 (5-9 flats)
        recurrence: true, // 10
        propertyDamage: true, // 5
      });

      expect(res.score).toBe(76); // 28 + 18 + 15 + 10 + 5 = 76
      expect(res.priorityBand).toBe('HIGH');
    });

    it('calculates Critical priority correctly (85-100)', () => {
      const res = ComplaintService.calculatePriority({
        severity: 'CRITICAL', // 40
        urgency: 'CRITICAL', // 25
        affectedFlatsCount: 12, // 20 (10+ flats)
        recurrence: false, // 0
        propertyDamage: true, // 5
      });

      expect(res.score).toBe(90); // 40 + 25 + 20 + 0 + 5 = 90
      expect(res.priorityBand).toBe('CRITICAL');
    });
  });

  describe('2. Safety Overrides (Forced Critical)', () => {
    it('forces Critical priority for Fire emergency even with Low factors', () => {
      const res = ComplaintService.calculatePriority({
        severity: 'LOW',
        urgency: 'LOW',
        affectedFlatsCount: 1,
        safetyOverrideType: 'FIRE_EMERGENCY',
      });

      expect(res.priorityBand).toBe('CRITICAL');
      expect(res.safetyOverrideTriggered).toBe(true);
      expect(res.safetyOverrideType).toBe('FIRE_EMERGENCY');
      expect(res.explanation).toContain('FORCED CRITICAL');
    });

    it('auto-detects lift entrapment keyword and forces Critical', () => {
      const res = ComplaintService.calculatePriority({
        severity: 'MEDIUM',
        urgency: 'MEDIUM',
        category: 'LIFT',
        title: 'Elderly resident trapped in Wing B lift',
        description: 'Lift stopped between 3rd and 4th floor, alarm ringing',
      });

      expect(res.priorityBand).toBe('CRITICAL');
      expect(res.safetyOverrideTriggered).toBe(true);
      expect(res.safetyOverrideType).toBe('LIFT_ENTRAPMENT');
    });

    it('auto-detects electrical hazard sparking and forces Critical', () => {
      const res = ComplaintService.calculatePriority({
        severity: 'LOW',
        urgency: 'LOW',
        category: 'ELECTRICAL',
        title: 'Basement meter board sparking and smoke',
        description: 'Live exposed wire sparking near water pump',
      });

      expect(res.priorityBand).toBe('CRITICAL');
      expect(res.safetyOverrideTriggered).toBe(true);
      expect(res.safetyOverrideType).toBe('ELECTRICAL_HAZARD');
    });
  });

  describe('3. Anonymous Complaints & Data Separation', () => {
    it('redacts complainant identity and flat from public record when anonymous is requested', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Late night loud music and party in Wing A',
        description: 'Persistent noise past 1:00 am disturbing residents on 4th floor.',
        category: 'NOISE',
        severity: 'MEDIUM',
        urgency: 'HIGH',
        isAnonymous: true,
        flatId: 'flat-402',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      expect(complaint.isAnonymous).toBe(true);
      expect(complaint.createdByProfileId).toBeUndefined();
      expect(complaint.createdByName).toBe('Anonymous Resident');
      expect(complaint.flatId).toBeUndefined();

      // Committee view should have no leaks
      const committeeList = await ComplaintService.getComplaintsForCommittee();
      const found = committeeList.find((c) => c.id === complaint.id);
      expect(found).toBeDefined();
      expect(found?.createdByName).toBe('Anonymous Resident');
      expect(found?.flatId).toBeUndefined();
      expect(found?.createdByProfileId).toBeUndefined();
    });

    it('allows Super Admin to reveal identity only with valid legal justification and logs audit', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Illegal structural alteration reported',
        description: 'Load-bearing wall being drilled without permission.',
        category: 'STRUCTURAL',
        severity: 'CRITICAL',
        urgency: 'CRITICAL',
        isAnonymous: true,
        flatId: 'flat-402',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      // Reject without valid legal reason
      await expect(
        ComplaintService.revealAnonymousIdentity(complaint.id, 'admin-sharma', 'Just checking')
      ).rejects.toThrow('A mandatory legal/operational justification (min 15 characters) is required');

      // Valid reveal
      const revealed = await ComplaintService.revealAnonymousIdentity(
        complaint.id,
        'admin-sharma',
        'Municipal inspection notice requiring complainant witness corroboration'
      );

      expect(revealed.complainantId).toBe('user-patel');
      expect(revealed.complainantName).toBe('Jonathan Patel');
      expect(revealed.flatId).toBe('flat-402');
    });
  });

  describe('4. Complaint Media Validation', () => {
    it('validates file sizes and MIME types correctly', () => {
      // Rejects oversized image (> 10MB)
      expect(() =>
        ComplaintService.validateMedia([
          {
            fileType: 'IMAGE',
            originalFileName: 'damage.jpg',
            fileSizeBytes: 11 * 1024 * 1024,
            mimeType: 'image/jpeg',
          },
        ])
      ).toThrow('exceeds 10 MB maximum limit');

      // Rejects oversized video (> 50MB)
      expect(() =>
        ComplaintService.validateMedia([
          {
            fileType: 'VIDEO',
            originalFileName: 'leakage.mp4',
            fileSizeBytes: 52 * 1024 * 1024,
            mimeType: 'video/mp4',
          },
        ])
      ).toThrow('exceeds 50 MB maximum limit');

      // Rejects unsupported MIME type
      expect(() =>
        ComplaintService.validateMedia([
          {
            fileType: 'IMAGE',
            originalFileName: 'script.exe',
            fileSizeBytes: 1024,
            mimeType: 'application/x-msdownload',
          },
        ])
      ).toThrow('Invalid image type');

      // Sanitizes valid file
      const stored = ComplaintService.validateMedia([
        {
          fileType: 'IMAGE',
          originalFileName: 'resident_jonathan_flat402.png',
          fileSizeBytes: 2 * 1024 * 1024,
          mimeType: 'image/png',
        },
      ]);
      expect(stored).toHaveLength(1);
      expect(stored[0].sanitizedFileName).not.toContain('jonathan');
      expect(stored[0].sanitizedFileName).toMatch(/^complaint_evidence_\d+_[a-z0-9]+\.png$/);
    });
  });

  describe('5. Committee Priority Override', () => {
    it('allows committee to override priority with mandatory justification', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Intermittent dripping from corridor ceiling',
        description: 'Water drips slowly during rain.',
        category: 'PLUMBING',
        severity: 'LOW',
        urgency: 'LOW',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      expect(complaint.effectivePriority).toBe('LOW');

      // Rejects override without adequate reason
      await expect(
        ComplaintService.overridePriority(complaint.id, 'CRITICAL', 'urgent', 'committee-rosa')
      ).rejects.toThrow('A mandatory justification of at least 8 characters is required');

      // Valid override
      const updated = await ComplaintService.overridePriority(
        complaint.id,
        'CRITICAL',
        'Ceiling contains electrical junction box directly below drip point',
        'committee-rosa'
      );

      expect(updated.committeePriority).toBe('CRITICAL');
      expect(updated.effectivePriority).toBe('CRITICAL');
      expect(updated.computedScore).toBe(complaint.computedScore); // Preserves automated score
    });
  });

  describe('6. Task Assignment & ETA Calculation', () => {
    it('creates and assigns task to active staff and calculates deterministic ETA', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Main pipeline burst in basement',
        description: 'Water flooding basement parking bay P2.',
        category: 'PLUMBING',
        severity: 'CRITICAL',
        urgency: 'CRITICAL',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      const task = await ComplaintService.assignTask({
        complaintId: complaint.id,
        title: 'Repair Basement Water Pipe Burst',
        assignedStaffId: 'staff-002', // Ramesh Plumber (Active)
      });

      expect(task.status).toBe('ASSIGNED');
      expect(task.assignedStaffName).toBe('Ramesh Plumber');
      expect(task.estimatedDurationHours).toBeGreaterThan(0);
      expect(task.etaStatus).toBe('PROPOSED');
      expect(complaint.status).toBe('ASSIGNED');
    });

    it('rejects task assignment to inactive staff', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Leaking tap',
        description: 'Water tap leaking in clubhouse washroom.',
        category: 'PLUMBING',
        severity: 'LOW',
        urgency: 'LOW',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      await expect(
        ComplaintService.assignTask({
          complaintId: complaint.id,
          title: 'Fix tap',
          assignedStaffId: 'staff-005', // Vikas Inactive
        })
      ).rejects.toThrow('Cannot assign task to inactive staff member');
    });

    it('confirms official ETA with Committee authorization', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Clubhouse gym AC cooling breakdown',
        description: 'AC unit not blowing cool air during peak hours.',
        category: 'AMENITIES',
        severity: 'MEDIUM',
        urgency: 'MEDIUM',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      await ComplaintService.assignTask({
        complaintId: complaint.id,
        title: 'AC Servicing',
        assignedStaffId: 'staff-003', // Dilip Electrician
      });

      const targetDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const updated = await ComplaintService.confirmETA(
        complaint.id,
        targetDate,
        'committee-rosa',
        'Vendor confirmed parts arrival by tomorrow morning'
      );

      expect(updated.confirmedEta).toBe(new Date(targetDate).toISOString());
      expect(updated.confirmedEtaBy).toBe('committee-rosa');
    });
  });

  describe('7. Staff Progress Updates & Resolution Workflow', () => {
    it('allows operational staff to record progress and submit resolution', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Gate 1 boom barrier sensor loose',
        description: 'Sensor cable loose, causing gate to stop abruptly.',
        category: 'SECURITY',
        severity: 'HIGH',
        urgency: 'HIGH',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      const task = await ComplaintService.assignTask({
        complaintId: complaint.id,
        title: 'Fasten boom barrier sensor',
        assignedStaffId: 'staff-001', // Santosh Yadav
      });

      // Update to IN_PROGRESS
      await ComplaintService.updateTaskProgress(task.id, {
        statusUpdate: 'IN_PROGRESS',
        notes: 'Disassembled sensor housing to realign bracket',
        updatedByUserId: 'staff-001',
      });
      expect(task.status).toBe('IN_PROGRESS');
      expect(complaint.status).toBe('IN_PROGRESS');

      // Resolve Task
      await ComplaintService.updateTaskProgress(task.id, {
        statusUpdate: 'RESOLVED',
        notes: 'Realigned bracket and tested 10 vehicle cycles successfully.',
        updatedByUserId: 'staff-001',
        resolutionNotes: 'Fastened with anti-vibration washers.',
      });

      expect(task.status).toBe('RESOLVED');
      expect(task.resolvedAt).toBeDefined();
      expect(complaint.status).toBe('RESOLVED');
    });
  });

  describe('8. Reopen Workflow & Resident Feedback', () => {
    it('allows resident to reopen a resolved complaint with a valid explanation', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Clubhouse door lock jamming',
        description: 'Key gets stuck in deadbolt.',
        category: 'AMENITIES',
        severity: 'LOW',
        urgency: 'LOW',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      const task = await ComplaintService.assignTask({
        complaintId: complaint.id,
        title: 'Lubricate lock',
        assignedStaffId: 'staff-004',
      });

      await ComplaintService.updateTaskProgress(task.id, {
        statusUpdate: 'RESOLVED',
        notes: 'Lubricated lock cylinder.',
        updatedByUserId: 'staff-004',
      });

      expect(complaint.status).toBe('RESOLVED');

      // Reopen
      const reopened = await ComplaintService.reopenComplaint(
        complaint.id,
        'Lock is jammed again after 2 hours; latch is misaligned.',
        'user-patel'
      );

      expect(reopened.status).toBe('REOPENED');
      expect(reopened.reopenedCount).toBe(1);
      expect(reopened.reopenedReason).toContain('Lock is jammed again');
    });

    it('records 1-5 star resident feedback on resolved complaints and prevents duplicates', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Garden light replacement',
        description: 'Pathway bulb fused near bench 3.',
        category: 'ELECTRICAL',
        severity: 'LOW',
        urgency: 'LOW',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      const task = await ComplaintService.assignTask({
        complaintId: complaint.id,
        title: 'Replace bulb',
        assignedStaffId: 'staff-003',
      });

      await ComplaintService.updateTaskProgress(task.id, {
        statusUpdate: 'RESOLVED',
        notes: 'Replaced with 12W LED bulb.',
        updatedByUserId: 'staff-003',
      });

      // Submit feedback
      const feedback = await ComplaintService.submitFeedback(
        complaint.id,
        5,
        'Fixed very promptly. Thank you!'
      );
      expect(feedback.rating).toBe(5);
      expect(feedback.feedbackComments).toBe('Fixed very promptly. Thank you!');

      // Prevent duplicate feedback
      await expect(
        ComplaintService.submitFeedback(complaint.id, 4, 'Trying again')
      ).rejects.toThrow('Feedback has already been submitted for this complaint');
    });
  });

  describe('9. Resident Flat Scoping & Privacy Isolation', () => {
    it('strictly isolates complaints by flat for resident inquiries', async () => {
      // Resident A complaint
      await ComplaintService.submitComplaint({
        title: 'Balcony seepage in Flat A-402',
        description: 'Rainwater entering living room.',
        category: 'PLUMBING',
        severity: 'MEDIUM',
        urgency: 'HIGH',
        flatId: 'flat-402',
        complainantProfileId: 'user-patel',
        complainantName: 'Jonathan Patel',
      });

      // Resident B complaint (Neighbor)
      await ComplaintService.submitComplaint({
        title: 'Kitchen sink block in Flat B-201',
        description: 'Sink clogged completely.',
        category: 'PLUMBING',
        severity: 'MEDIUM',
        urgency: 'MEDIUM',
        flatId: 'flat-201',
        complainantProfileId: 'user-rao',
        complainantName: 'Sunita Rao',
      });

      // Resident A (Patel) checks complaints
      const patelComplaints = await ComplaintService.getComplaintsForResident('user-patel', ['flat-402']);
      expect(patelComplaints).toHaveLength(1);
      expect(patelComplaints[0].title).toBe('Balcony seepage in Flat A-402');

      // Resident B (Rao) checks complaints
      const raoComplaints = await ComplaintService.getComplaintsForResident('user-rao', ['flat-201']);
      expect(raoComplaints).toHaveLength(1);
      expect(raoComplaints[0].title).toBe('Kitchen sink block in Flat B-201');
    });
  });
});
