export type Student = {
  id: string;
  firstName: string;
  lastName: string | null;
  gradeLevel: string | null;
  gpa: number | null;
  satTotal: number | null;
  actComposite: number | null;
  majorInterest: string | null;
  notes: string | null;
  createdAt: string;
};

export const ACTIVE_STUDENT_COOKIE = "c101_active_student";
