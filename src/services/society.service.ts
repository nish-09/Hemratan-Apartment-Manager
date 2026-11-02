export interface FlatRecord {
  id: string;
  wing: string;
  flatNumber: string;
  floor: number;
  areaSqFt: number;
  intercomNumber: string;
  isOccupied: boolean;
  residents: Array<{
    userId: string;
    fullName: string;
    membershipType: 'OWNER_RESIDING' | 'OWNER_NON_RESIDING' | 'TENANT' | 'FAMILY_MEMBER';
    isPrimary: boolean;
  }>;
}

// In-memory persistent society flats store with mock seed for 100 flats
const flatsStore: FlatRecord[] = [
  {
    id: 'flat-a-101',
    wing: 'A',
    flatNumber: '101',
    floor: 1,
    areaSqFt: 1150,
    intercomNumber: '1101',
    isOccupied: true,
    residents: [
      {
        userId: 'usr-res-101',
        fullName: 'Vikram Seth',
        membershipType: 'OWNER_RESIDING',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'flat-a-201',
    wing: 'A',
    flatNumber: '201',
    floor: 2,
    areaSqFt: 1250,
    intercomNumber: '1201',
    isOccupied: true,
    residents: [
      {
        userId: 'usr-comm-002',
        fullName: 'Rosa Palmour',
        membershipType: 'OWNER_RESIDING',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'flat-a-402',
    wing: 'A',
    flatNumber: '402',
    floor: 4,
    areaSqFt: 1450,
    intercomNumber: '1402',
    isOccupied: true,
    residents: [
      {
        userId: 'usr-res-004',
        fullName: 'Jonathan Patel',
        membershipType: 'OWNER_RESIDING',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'flat-b-102',
    wing: 'B',
    flatNumber: '102',
    floor: 1,
    areaSqFt: 1050,
    intercomNumber: '2102',
    isOccupied: false,
    residents: [],
  },
];

// Helper to seed standard society flats up to 36 occupied and 64 vacant flats (~100 flats total)
if (flatsStore.length <= 4) {
  const wings = ['A', 'B', 'C', 'D'];
  for (const wing of wings) {
    for (let floor = 1; floor <= 7; floor++) {
      for (let unit = 1; unit <= 4; unit++) {
        const flatNumber = `${floor}0${unit}`;
        const id = `flat-${wing.toLowerCase()}-${flatNumber}`;
        if (!flatsStore.some((f) => f.id === id)) {
          const isOccupied = floor <= 2 || (floor === 4 && unit <= 2);
          flatsStore.push({
            id,
            wing,
            flatNumber,
            floor,
            areaSqFt: 950 + (unit * 150),
            intercomNumber: `${wing === 'A' ? 1 : wing === 'B' ? 2 : wing === 'C' ? 3 : 4}${flatNumber}`,
            isOccupied,
            residents: isOccupied
              ? [
                  {
                    userId: `usr-${wing.toLowerCase()}-${flatNumber}`,
                    fullName: `Resident ${wing}-${flatNumber}`,
                    membershipType: 'OWNER_RESIDING',
                    isPrimary: true,
                  },
                ]
              : [],
          });
        }
      }
    }
  }
}

export class SocietyService {
  static getSocietyOverview() {
    const totalFlats = flatsStore.length;
    const occupiedFlats = flatsStore.filter((f) => f.isOccupied).length;
    const vacantFlats = totalFlats - occupiedFlats;
    const totalResidents = flatsStore.reduce((acc, f) => acc + f.residents.length, 0);

    return {
      buildingName: 'Hemratan Apartments',
      totalWings: 4,
      wings: ['A', 'B', 'C', 'D'],
      totalFlats,
      occupiedFlats,
      vacantFlats,
      occupancyPercentage: Math.round((occupiedFlats / totalFlats) * 100),
      totalResidents,
    };
  }

  static getFlats(filters?: { wing?: string; isOccupied?: boolean; search?: string }) {
    let result = [...flatsStore];

    if (filters?.wing) {
      result = result.filter((f) => f.wing.toUpperCase() === filters.wing?.toUpperCase());
    }
    if (filters?.isOccupied !== undefined) {
      result = result.filter((f) => f.isOccupied === filters.isOccupied);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (f) =>
          f.flatNumber.includes(q) ||
          f.wing.toLowerCase().includes(q) ||
          f.intercomNumber.includes(q) ||
          f.residents.some((r) => r.fullName.toLowerCase().includes(q))
      );
    }

    return result;
  }

  static getFlatById(flatId: string): FlatRecord | null {
    return flatsStore.find((f) => f.id === flatId) || null;
  }

  static createFlat(data: Omit<FlatRecord, 'id' | 'residents'>): FlatRecord {
    const id = `flat-${data.wing.toLowerCase()}-${data.flatNumber}`;
    const existing = flatsStore.find((f) => f.id === id);
    if (existing) {
      throw new Error(`Flat ${data.wing}-${data.flatNumber} already exists`);
    }

    const newFlat: FlatRecord = {
      ...data,
      id,
      residents: [],
    };
    flatsStore.push(newFlat);
    return newFlat;
  }

  static assignResident(
    flatId: string,
    resident: {
      userId: string;
      fullName: string;
      membershipType: 'OWNER_RESIDING' | 'OWNER_NON_RESIDING' | 'TENANT' | 'FAMILY_MEMBER';
      isPrimary?: boolean;
    }
  ): FlatRecord {
    const flat = flatsStore.find((f) => f.id === flatId);
    if (!flat) {
      throw new Error(`Flat with ID ${flatId} not found`);
    }

    flat.residents.push({
      userId: resident.userId,
      fullName: resident.fullName,
      membershipType: resident.membershipType,
      isPrimary: resident.isPrimary ?? false,
    });
    flat.isOccupied = true;
    return flat;
  }
}
