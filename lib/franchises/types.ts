export type FranchiseRole = "counselor" | "owner" | "super_admin";

export type Franchise = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
};

export type Membership = {
  franchise: Franchise;
  role: FranchiseRole;
};

export const ACTIVE_FRANCHISE_COOKIE = "c101_active_franchise";
