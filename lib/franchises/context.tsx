"use client";

import { createContext, useContext } from "react";
import type { Membership } from "./types";

type ActiveFranchiseContextValue = {
  active: Membership | null;
  memberships: Membership[];
};

const ActiveFranchiseContext = createContext<ActiveFranchiseContextValue>({
  active: null,
  memberships: [],
});

export function ActiveFranchiseProvider({
  active,
  memberships,
  children,
}: {
  active: Membership | null;
  memberships: Membership[];
  children: React.ReactNode;
}) {
  return (
    <ActiveFranchiseContext.Provider value={{ active, memberships }}>
      {children}
    </ActiveFranchiseContext.Provider>
  );
}

export function useActiveFranchise(): Membership | null {
  return useContext(ActiveFranchiseContext).active;
}

export function useMemberships(): Membership[] {
  return useContext(ActiveFranchiseContext).memberships;
}
