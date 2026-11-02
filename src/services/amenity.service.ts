export interface Amenity {
  id: string;
  name: string;
  category: 'SPORTS' | 'COMMUNITY' | 'WELLNESS' | 'RECREATION';
  description: string;
  capacity: number;
  hourlyFeePaise: number;
  operatingHours: string;
  isActive: boolean;
}

export interface AmenityBooking {
  id: string;
  amenityId: string;
  amenityName: string;
  flatId: string;
  flatNumber: string;
  residentId: string;
  residentName: string;
  bookingDate: string; // YYYY-MM-DD
  slot: string; // e.g. "06:00 - 08:00"
  feePaise: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  cancellationReason?: string;
  createdAt: string;
}

const INITIAL_AMENITIES: Amenity[] = [
  {
    id: 'amenity-clubhouse',
    name: 'Clubhouse Banquet Hall',
    category: 'COMMUNITY',
    description: 'Air-conditioned community hall suitable for family events and meetings.',
    capacity: 80,
    hourlyFeePaise: 50000, // ₹500/hr
    operatingHours: '09:00 - 22:00',
    isActive: true,
  },
  {
    id: 'amenity-pool',
    name: 'Swimming Pool',
    category: 'WELLNESS',
    description: 'Cleaned and filtered pool with dedicated kids shallow section.',
    capacity: 25,
    hourlyFeePaise: 0, // Complimentary for residents
    operatingHours: '06:00 - 20:00',
    isActive: true,
  },
  {
    id: 'amenity-badminton',
    name: 'Badminton Court',
    category: 'SPORTS',
    description: 'Indoor wooden surface court with tournament lighting.',
    capacity: 4,
    hourlyFeePaise: 10000, // ₹100/hr
    operatingHours: '06:00 - 22:00',
    isActive: true,
  },
  {
    id: 'amenity-gym',
    name: 'Fitness Centre & Gym',
    category: 'WELLNESS',
    description: 'Equipped with cardio stations, free weights, and cross-trainer machines.',
    capacity: 20,
    hourlyFeePaise: 0, // Complimentary
    operatingHours: '05:30 - 22:00',
    isActive: true,
  },
  {
    id: 'amenity-terrace',
    name: 'Terrace Garden Pavilion',
    category: 'RECREATION',
    description: 'Open-air gazebo with panoramic city view for small gatherings.',
    capacity: 35,
    hourlyFeePaise: 25000, // ₹250/hr
    operatingHours: '16:00 - 22:00',
    isActive: true,
  },
];

const bookingsStore: AmenityBooking[] = [
  {
    id: 'ab-seed-001',
    amenityId: 'amenity-clubhouse',
    amenityName: 'Clubhouse Banquet Hall',
    flatId: 'flat-a-402',
    flatNumber: 'A-402',
    residentId: 'usr-res-004',
    residentName: 'Jonathan Patel',
    bookingDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    slot: '18:00 - 21:00',
    feePaise: 150000, // ₹1,500
    status: 'CONFIRMED',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'ab-seed-002',
    amenityId: 'amenity-badminton',
    amenityName: 'Badminton Court',
    flatId: 'flat-a-402',
    flatNumber: 'A-402',
    residentId: 'usr-res-004',
    residentName: 'Jonathan Patel',
    bookingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    slot: '07:00 - 08:00',
    feePaise: 10000,
    status: 'CONFIRMED',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'ab-seed-003',
    amenityId: 'amenity-clubhouse',
    amenityName: 'Clubhouse Banquet Hall',
    flatId: 'flat-a-101',
    flatNumber: 'A-101',
    residentId: 'usr-res-101',
    residentName: 'Vikram Seth',
    bookingDate: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    slot: '14:00 - 17:00',
    feePaise: 150000,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'ab-seed-004',
    amenityId: 'amenity-terrace',
    amenityName: 'Terrace Garden Pavilion',
    flatId: 'flat-a-201',
    flatNumber: 'A-201',
    residentId: 'usr-comm-002',
    residentName: 'Rosa Palmour',
    bookingDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    slot: '18:00 - 20:00',
    feePaise: 50000,
    status: 'CANCELLED',
    cancellationReason: 'Rain forecast on terrace pavilion',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export class AmenityService {
  static getAmenities(): Amenity[] {
    return [...INITIAL_AMENITIES];
  }

  static getAmenityById(id: string): Amenity | undefined {
    return INITIAL_AMENITIES.find((a) => a.id === id);
  }

  static getBookings(filters?: {
    flatId?: string;
    amenityId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): AmenityBooking[] {
    let result = [...bookingsStore];

    if (filters?.flatId) {
      result = result.filter((b) => b.flatId === filters.flatId);
    }
    if (filters?.amenityId) {
      result = result.filter((b) => b.amenityId === filters.amenityId);
    }
    if (filters?.status) {
      result = result.filter((b) => b.status === filters.status);
    }
    if (filters?.dateFrom) {
      result = result.filter((b) => b.bookingDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      result = result.filter((b) => b.bookingDate <= filters.dateTo!);
    }

    return result.sort((a, b) => (b.bookingDate > a.bookingDate ? 1 : -1));
  }

  static createBooking(input: {
    amenityId: string;
    flatId: string;
    flatNumber: string;
    residentId: string;
    residentName: string;
    bookingDate: string;
    slot: string;
  }): AmenityBooking {
    const amenity = this.getAmenityById(input.amenityId);
    if (!amenity) {
      throw new Error(`Amenity ${input.amenityId} not found`);
    }

    // Check conflict for same amenity, same date, same slot
    const conflict = bookingsStore.find(
      (b) =>
        b.amenityId === input.amenityId &&
        b.bookingDate === input.bookingDate &&
        b.slot === input.slot &&
        b.status !== 'CANCELLED'
    );
    if (conflict) {
      throw new Error(`Time slot ${input.slot} on ${input.bookingDate} is already booked for ${amenity.name}`);
    }

    const newBooking: AmenityBooking = {
      id: `ab-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amenityId: amenity.id,
      amenityName: amenity.name,
      flatId: input.flatId,
      flatNumber: input.flatNumber,
      residentId: input.residentId,
      residentName: input.residentName,
      bookingDate: input.bookingDate,
      slot: input.slot,
      feePaise: amenity.hourlyFeePaise,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    bookingsStore.push(newBooking);
    return newBooking;
  }

  static cancelBooking(bookingId: string, reason?: string): AmenityBooking {
    const booking = bookingsStore.find((b) => b.id === bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    if (booking.status === 'CANCELLED') {
      throw new Error(`Booking ${bookingId} is already cancelled`);
    }

    booking.status = 'CANCELLED';
    booking.cancellationReason = reason || 'Resident requested cancellation';
    return booking;
  }

  static getStatistics() {
    const totalBookings = bookingsStore.length;
    const confirmed = bookingsStore.filter((b) => b.status === 'CONFIRMED').length;
    const completed = bookingsStore.filter((b) => b.status === 'COMPLETED').length;
    const cancelled = bookingsStore.filter((b) => b.status === 'CANCELLED').length;
    const totalRevenuePaise = bookingsStore
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + b.feePaise, 0);

    return {
      totalBookings,
      activeBookings: confirmed,
      completedBookings: completed,
      cancelledBookings: cancelled,
      cancellationRate: totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0,
      totalRevenuePaise,
    };
  }

  static resetStore() {
    bookingsStore.length = 0;
    bookingsStore.push(
      {
        id: 'ab-seed-001',
        amenityId: 'amenity-clubhouse',
        amenityName: 'Clubhouse Banquet Hall',
        flatId: 'flat-a-402',
        flatNumber: 'A-402',
        residentId: 'usr-res-004',
        residentName: 'Jonathan Patel',
        bookingDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        slot: '18:00 - 21:00',
        feePaise: 150000,
        status: 'CONFIRMED',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'ab-seed-002',
        amenityId: 'amenity-badminton',
        amenityName: 'Badminton Court',
        flatId: 'flat-a-402',
        flatNumber: 'A-402',
        residentId: 'usr-res-004',
        residentName: 'Jonathan Patel',
        bookingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        slot: '07:00 - 08:00',
        feePaise: 10000,
        status: 'CONFIRMED',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      }
    );
  }
}
