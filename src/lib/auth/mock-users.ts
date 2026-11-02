import { UserProfile } from '@/types/roles';

export interface AuthenticatedUser extends UserProfile {
  assignedFlatIds: string[];
}

export const SEED_USERS: AuthenticatedUser[] = [
  {
    id: 'usr-admin-001',
    email: 'admin@hemratan.com',
    fullName: 'Rajesh Sharma',
    role: 'SUPER_ADMIN',
    isActive: true,
    phoneNumber: '+91 98200 11223',
    assignedFlatIds: [],
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
  },
  {
    id: 'usr-guard-003',
    email: 'guard@hemratan.com',
    fullName: 'Santosh Yadav',
    role: 'GUARD',
    isActive: true,
    phoneNumber: '+91 98200 77889',
    assignedFlatIds: [],
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
  },
];
