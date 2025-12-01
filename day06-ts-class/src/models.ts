// Shared models, interfaces, and enums used by the student classes.

/** Possible status values for a student. */
export enum StudentStatus {
  Active = "active",
  Inactive = "inactive",
  Graduated = "graduated",
}

/** Simple enum to represent grade levels. */
export enum GradeLevel {
  Freshman = 1,
  Sophomore = 2,
  Junior = 3,
  Senior = 4,
}

/** Basic shape of a person. */
export interface Person {
  id: number;
  firstName: string;
  lastName: string;
}

/**
 * Interface describing the core properties of a student.
 */
export interface StudentProps extends Person {
  gradeLevel: GradeLevel;
  status: StudentStatus;
  email?: string; // optional, not every student must have an email
}

/**
 * Interface for something that can display itself as a user-friendly string.
 */
export interface Displayable {
  toDisplayString(): string;
}
