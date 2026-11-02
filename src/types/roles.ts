export type UserRole = 'SUPER_ADMIN' | 'COMMITTEE' | 'GUARD' | 'RESIDENT';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  flatDetails?: {
    wing: string;
    flatNumber: string;
    membershipType: 'OWNER_RESIDING' | 'OWNER_NON_RESIDING' | 'TENANT' | 'FAMILY_MEMBER';
  };
}
