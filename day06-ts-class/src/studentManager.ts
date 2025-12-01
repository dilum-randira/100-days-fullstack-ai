import { GradeLevel, StudentStatus } from "./models";
import { Student } from "./student";

/**
 * Manages a small collection of Student instances.
 */
export class StudentManager {
  private students: Student[] = [];

  addStudent(student: Student): void {
    this.students.push(student);
  }

  /**
   * Find a student by ID.
   */
  findById(id: number): Student | undefined {
    return this.students.find((s) => s.id === id);
  }

  /**
   * Get all students with a given status.
   */
  filterByStatus(status: StudentStatus): Student[] {
    return this.students.filter((s) => s.status === status);
  }

  /**
   * Get all students with a given grade level.
   */
  filterByGradeLevel(level: GradeLevel): Student[] {
    return this.students.filter((s) => s.gradeLevel === level);
  }

  /**
   * Promote a student to the next grade level, up to Senior.
   */
  promoteStudent(id: number): void {
    const student = this.findById(id);
    if (!student) return;

    if (student.gradeLevel < GradeLevel.Senior) {
      student.gradeLevel = (student.gradeLevel + 1) as GradeLevel;
    }
  }

  /**
   * Print a summary of all students to the console.
   */
  printSummary(): void {
    if (this.students.length === 0) {
      console.log("No students in the system yet.");
      return;
    }

    console.log("Students:");
    for (const student of this.students) {
      console.log("-", student.toDisplayString());
    }
  }
}
