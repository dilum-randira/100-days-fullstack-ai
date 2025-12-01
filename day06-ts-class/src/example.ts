import { GradeLevel, StudentStatus } from "./models";
import { Student } from "./student";
import { StudentManager } from "./studentManager";

function main() {
  const manager = new StudentManager();

  const alice = new Student({
    id: 1,
    firstName: "Alice",
    lastName: "Anderson",
    gradeLevel: GradeLevel.Freshman,
    status: StudentStatus.Active,
    email: "alice@example.com",
  });

  const bob = new Student({
    id: 2,
    firstName: "Bob",
    lastName: "Brown",
    gradeLevel: GradeLevel.Senior,
    status: StudentStatus.Inactive,
  });

  manager.addStudent(alice);
  manager.addStudent(bob);

  console.log("=== Initial Students ===");
  manager.printSummary();

  console.log("\n=== Promote Alice ===");
  manager.promoteStudent(1);
  manager.printSummary();

  console.log("\n=== Graduate Bob ===");
  const bobFound = manager.findById(2);
  if (bobFound) {
    bobFound.graduate();
  }
  manager.printSummary();

  console.log("\n=== Active Students ===");
  const activeStudents = manager.filterByStatus(StudentStatus.Active);
  for (const s of activeStudents) {
    console.log("-", s.toDisplayString());
  }
}

main();
