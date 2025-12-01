import { Displayable, GradeLevel, StudentProps, StudentStatus } from "./models";

/**
 * Class representing a student in the system.
 *
 * Demonstrates:
 * - implementing interfaces
 * - using enums
 * - encapsulating state with methods
 */
export class Student implements Displayable {
  // `readonly` means these properties cannot be reassigned after construction.
  public readonly id: number;
  public readonly firstName: string;
  public readonly lastName: string;

  private _gradeLevel: GradeLevel;
  private _status: StudentStatus;
  private _email?: string;

  constructor(props: StudentProps) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this._gradeLevel = props.gradeLevel;
    this._status = props.status;
    this._email = props.email;
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get gradeLevel(): GradeLevel {
    return this._gradeLevel;
  }

  set gradeLevel(level: GradeLevel) {
    this._gradeLevel = level;
  }

  get status(): StudentStatus {
    return this._status;
  }

  set status(status: StudentStatus) {
    this._status = status;
  }

  get email(): string | undefined {
    return this._email;
  }

  set email(value: string | undefined) {
    this._email = value;
  }

  /** Mark the student as graduated. */
  graduate() {
    this._status = StudentStatus.Graduated;
  }

  /** Mark the student as active. */
  activate() {
    this._status = StudentStatus.Active;
  }

  /** Mark the student as inactive. */
  deactivate() {
    this._status = StudentStatus.Inactive;
  }

  /**
   * Implementation of Displayable.toDisplayString.
   * Returns a human-readable summary of the student.
   */
  toDisplayString(): string {
    const levelName = GradeLevel[this._gradeLevel]; // e.g. "Freshman"
    return `${this.fullName} (ID: ${this.id}) - ${levelName}, ${this._status}`;
  }
}
