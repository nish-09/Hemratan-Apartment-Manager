export interface SocietyAnnouncement {
  id: string;
  title: string;
  content: string;
  category: 'MAINTENANCE' | 'SECURITY' | 'MEETING' | 'EVENT' | 'GENERAL';
  priority: 'NORMAL' | 'URGENT';
  authorName: string;
  authorRole: string;
  publishedAt: string;
  expiresAt?: string;
  pinned: boolean;
}

const announcementsStore: SocietyAnnouncement[] = [
  {
    id: 'ann-001',
    title: 'Water Overhead Tank Cleaning Schedule — Wing A & B',
    content: 'Annual cleaning of the overhead water tanks for Wings A & B will be conducted on Saturday from 10:00 AM to 02:00 PM. Water supply will be suspended during this window. Residents are advised to store sufficient water in advance.',
    category: 'MAINTENANCE',
    priority: 'URGENT',
    authorName: 'Managing Committee',
    authorRole: 'Hon. Secretary',
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
    pinned: true,
  },
  {
    id: 'ann-002',
    title: 'Quarterly General Body Meeting (AGM) Notice',
    content: 'The 3rd Quarter General Body Meeting will be held at the Clubhouse Banquet Hall next Sunday at 05:30 PM. Agenda includes financial audit presentation, lift modernisation tenders, and solar panel installation.',
    category: 'MEETING',
    priority: 'NORMAL',
    authorName: 'Managing Committee',
    authorRole: 'Hon. Secretary',
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 10).toISOString(),
    pinned: true,
  },
  {
    id: 'ann-003',
    title: 'Visitor Pass & Intercom Security Verification Protocols',
    content: 'All residents are requested to ensure gate visitors and delivery executives are verified via Godrej Intercom or Resident App OTP before granting access.',
    category: 'SECURITY',
    priority: 'NORMAL',
    authorName: 'Chief Security Officer',
    authorRole: 'Security Head',
    publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    pinned: false,
  },
];

export class AnnouncementService {
  static getAnnouncements(filters?: { category?: string; pinnedOnly?: boolean }): SocietyAnnouncement[] {
    let result = [...announcementsStore];

    if (filters?.category) {
      result = result.filter((a) => a.category === filters.category);
    }
    if (filters?.pinnedOnly) {
      result = result.filter((a) => a.pinned);
    }

    return result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }

  static createAnnouncement(input: {
    title: string;
    content: string;
    category: SocietyAnnouncement['category'];
    priority: SocietyAnnouncement['priority'];
    authorName: string;
    authorRole: string;
    expiresAt?: string;
    pinned?: boolean;
  }): SocietyAnnouncement {
    const announcement: SocietyAnnouncement = {
      id: `ann-${Date.now()}`,
      title: input.title,
      content: input.content,
      category: input.category,
      priority: input.priority,
      authorName: input.authorName,
      authorRole: input.authorRole,
      publishedAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      pinned: input.pinned ?? false,
    };

    announcementsStore.unshift(announcement);
    return announcement;
  }
}
