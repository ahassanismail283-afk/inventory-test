export type Role = 'ADMIN' | 'MANAGER' | 'CLIENT';

export interface UserProfile {
  id: string; // Matches auth.uid()
  email: string;
  role: Role;
  locationIds: string[]; // List of locations this user can access
  nickname?: string | null;
  avatar_base64?: string | null;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  createdAt: string;
}

export interface Item {
  id: string;
  name: string;
  currentQuantity: number;
  locationId: string;
  createdAt: string;
}

export type TransactionType = 'إضافة' | 'استهلاك';

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  date: string;
  locationId: string;
  userId: string;
  createdAt: string;
}

// Supabase Database type generated structure (mocked)
export interface Database {
  public: {
    Tables: {
      users: { Row: UserProfile; Insert: any; Update: any };
      locations: { Row: Location; Insert: any; Update: any };
      items: { Row: Item; Insert: any; Update: any };
      transactions: { Row: Transaction; Insert: any; Update: any };
    };
  };
}
