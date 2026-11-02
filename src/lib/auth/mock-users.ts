import { UserProfile } from '@/types/roles';
import { hashPassword } from './password';

export interface AuthenticatedUser extends UserProfile {
  assignedFlatIds: string[];
  passwordHash: string;
}

// Default standard seed password for testing: Password@123
const DEFAULT_SEED_HASH = hashPassword('Password@123');

export const SEED_USERS: AuthenticatedUser[] = [
  {
    id: 'usr-admin-001',
    email: 'admin@hemratan.com',
    fullName: 'Rajesh Sharma',
    role: 'SUPER_ADMIN',
    isActive: true,
    phoneNumber: '+91 98200 11223',
    assignedFlatIds: [],
    passwordHash: DEFAULT_SEED_HASH,
  },
  {
    id: 'usr-comm-002',
    email: 'committee@hemratan.com',
    fullName: 'Rosa Palmour',
    role: 'COMMITTEE',
    isActive: true,
    phoneNumber: '+91 98200 44556',
    flatDetails: {
      wing: 'A',
      flatNumber: '201',
      membershipType: 'OWNER_RESIDING',
    },
    assignedFlatIds: ['flat-a-201'],
    passwordHash: DEFAULT_SEED_HASH,
  },
  {
    id: 'usr-guard-003',
    email: 'guard@hemratan.com',
    fullName: 'Santosh Yadav',
    role: 'GUARD',
    isActive: true,
    phoneNumber: '+91 98200 77889',
    assignedFlatIds: [],
    passwordHash: DEFAULT_SEED_HASH,
  },
  {
    id: 'usr-res-004',
    email: 'resident@hemratan.com',
    fullName: 'Jonathan Patel',
    role: 'RESIDENT',
    isActive: true,
    phoneNumber: '+91 98200 99001',
    flatDetails: {
      wing: 'A',
      flatNumber: '402',
      membershipType: 'OWNER_RESIDING',
    },
    assignedFlatIds: ['flat-a-402'],
    passwordHash: DEFAULT_SEED_HASH,
  },
  {
    id: 'usr-deactivated-005',
    email: 'inactive@hemratan.com',
    fullName: 'Deactivated Resident',
    role: 'RESIDENT',
    isActive: false, // Explicitly deactivated account for security testing
    phoneNumber: '+91 98200 00000',
    assignedFlatIds: ['flat-b-102'],
    passwordHash: DEFAULT_SEED_HASH,
  },
];

export function findUserByEmail(email: string): AuthenticatedUser | null {
  const normalized = email.toLowerCase().trim();
  return SEED_USERS.find((u) => u.email.toLowerCase() === normalized) || null;
}

export function findUserById(id: string): AuthenticatedUser | null {
  return SEED_USERS.find((u) => u.id === id) || null;
}

export function setUserActiveStatus(id: string, isActive: boolean): boolean {
  const user = findUserById(id);
  if (!user) return false;
  user.isActive = isActive;
  return true;
}
