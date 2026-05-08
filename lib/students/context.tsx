"use client";

import { createContext, useContext } from "react";
import type { Student } from "./types";

type ActiveStudentContextValue = {
  activeStudent: Student | null;
  students: Student[];
};

const ActiveStudentContext = createContext<ActiveStudentContextValue>({
  activeStudent: null,
  students: [],
});

export function ActiveStudentProvider({
  activeStudent,
  students,
  children,
}: {
  activeStudent: Student | null;
  students: Student[];
  children: React.ReactNode;
}) {
  return (
    <ActiveStudentContext.Provider value={{ activeStudent, students }}>
      {children}
    </ActiveStudentContext.Provider>
  );
}

export function useActiveStudent(): Student | null {
  return useContext(ActiveStudentContext).activeStudent;
}

export function useStudentList(): Student[] {
  return useContext(ActiveStudentContext).students;
}
