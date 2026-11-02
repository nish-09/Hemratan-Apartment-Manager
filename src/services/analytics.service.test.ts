import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsService } from './analytics.service';
import { AmenityService } from './amenity.service';
import { AnnouncementService } from './announcement.service';

describe('Stage 7 — AnalyticsService, AmenityService & AnnouncementService', () => {
  beforeEach(() => {
    AmenityService.resetStore();
  });

  describe('AnalyticsService.resolveDateRange', () => {
    it('resolves TODAY range to start and end of current day', () => {
      const { start, end, label } = AnalyticsService.resolveDateRange({ range: 'TODAY' });
      expect(label).toBe('Today');
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
    });

    it('resolves 7D and 30D ranges correctly', () => {
      const range7 = AnalyticsService.resolveDateRange({ range: '7D' });
      expect(range7.label).toBe('Last 7 Days');
      const range30 = AnalyticsService.resolveDateRange({ range: '30D' });
      expect(range30.label).toBe('Last 30 Days');
      expect(range30.start.getTime()).toBeLessThan(range7.start.getTime());
    });

    it('resolves THIS_MONTH and PREV_MONTH', () => {
      const thisMonth = AnalyticsService.resolveDateRange({ range: 'THIS_MONTH' });
      expect(thisMonth.label).toBe('This Month');
      const prevMonth = AnalyticsService.resolveDateRange({ range: 'PREV_MONTH' });
      expect(prevMonth.label).toBe('Previous Month');
      expect(prevMonth.start.getTime()).toBeLessThan(thisMonth.start.getTime());
    });

    it('resolves CUSTOM date range', () => {
      const custom = AnalyticsService.resolveDateRange({
        range: 'CUSTOM',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
      expect(custom.label).toContain('2026-01-01');
      expect(custom.label).toContain('2026-01-31');
    });
  });

  describe('AnalyticsService.getSocietyWideAnalytics', () => {
    it('aggregates real persisted statistics across all society modules', async () => {
      const data = await AnalyticsService.getSocietyWideAnalytics({ range: '30D' });

      // Flats & Occupancy
      expect(data.flats.totalFlats).toBeGreaterThanOrEqual(100);
      expect(data.flats.occupiedFlats).toBeGreaterThan(0);
      expect(data.flats.vacantFlats).toBeGreaterThan(0);
      expect(data.flats.wingDistribution.length).toBe(4); // A, B, C, D

      // Visitors
      expect(data.visitors.currentlyInside).toBeGreaterThanOrEqual(1);
      expect(data.visitors.dailyTrends).toBeDefined();

      // Domestic Help
      expect(data.domesticHelp.totalStaff).toBeGreaterThan(0);
      expect(data.domesticHelp.byRole).toBeDefined();

      // Parking
      expect(data.parking.totalSlots).toBeGreaterThanOrEqual(5);
      expect(data.parking.allocatedSlots).toBeGreaterThanOrEqual(0);

      // Deliveries
      expect(data.deliveries.totalDeliveries).toBeGreaterThanOrEqual(0);

      // Complaints
      expect(data.complaints.totalComplaints).toBeGreaterThan(0);
      expect(data.complaints.averageResolutionHours).toBeGreaterThan(0);
      expect(data.complaints.priorityBreakdown).toBeDefined();

      // Finances
      expect(data.finances.totalBilledPaise).toBeGreaterThan(0);
      expect(data.finances.collectionPercentage).toBeGreaterThanOrEqual(0);

      // Amenities
      expect(data.amenities.totalBookings).toBeGreaterThan(0);
    });
  });

  describe('AmenityService', () => {
    it('lists available facilities', () => {
      const amenities = AmenityService.getAmenities();
      expect(amenities.length).toBeGreaterThanOrEqual(5);
      expect(amenities.some((a) => a.id === 'amenity-clubhouse')).toBe(true);
    });

    it('creates and prevents conflicting booking for same slot', () => {
      const targetDate = '2026-11-20';
      const slot = '10:00 - 12:00';

      const booking = AmenityService.createBooking({
        amenityId: 'amenity-badminton',
        flatId: 'flat-a-101',
        flatNumber: 'A-101',
        residentId: 'usr-res-101',
        residentName: 'Vikram Seth',
        bookingDate: targetDate,
        slot,
      });

      expect(booking.id).toBeDefined();
      expect(booking.status).toBe('CONFIRMED');

      // Attempt duplicate booking on same slot
      expect(() => {
        AmenityService.createBooking({
          amenityId: 'amenity-badminton',
          flatId: 'flat-a-402',
          flatNumber: 'A-402',
          residentId: 'usr-res-004',
          residentName: 'Jonathan Patel',
          bookingDate: targetDate,
          slot,
        });
      }).toThrow(/already booked/);
    });

    it('cancels booking with reason', () => {
      const booking = AmenityService.createBooking({
        amenityId: 'amenity-terrace',
        flatId: 'flat-a-402',
        flatNumber: 'A-402',
        residentId: 'usr-res-004',
        residentName: 'Jonathan Patel',
        bookingDate: '2026-11-25',
        slot: '19:00 - 21:00',
      });

      const cancelled = AmenityService.cancelBooking(booking.id, 'Change of schedule');
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancellationReason).toBe('Change of schedule');
    });
  });

  describe('AnnouncementService', () => {
    it('retrieves pinned and standard announcements', () => {
      const list = AnnouncementService.getAnnouncements();
      expect(list.length).toBeGreaterThanOrEqual(3);
      expect(list[0].pinned).toBe(true);
    });

    it('publishes a new circular', () => {
      const item = AnnouncementService.createAnnouncement({
        title: 'Emergency Generator Maintenance',
        content: 'Backup diesel generator testing tomorrow at 11 AM.',
        category: 'MAINTENANCE',
        priority: 'URGENT',
        authorName: 'Estate Manager',
        authorRole: 'Committee',
        pinned: true,
      });

      expect(item.id).toBeDefined();
      const list = AnnouncementService.getAnnouncements();
      expect(list[0].title).toBe('Emergency Generator Maintenance');
    });
  });
});
