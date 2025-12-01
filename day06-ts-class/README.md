# Day 6 – TypeScript Classes, Interfaces, and Enums

On Day 6, I practiced **object-oriented programming in TypeScript** by building a small
student management example using **classes**, **interfaces**, and **enums**.

## Project Structure

- `src/models.ts` – Shared interfaces and enums (`StudentStatus`, `GradeLevel`, `Person`, `StudentProps`, `Displayable`).
- `src/student.ts` – `Student` class implementing `Displayable` and using enums.
- `src/studentManager.ts` – `StudentManager` class that works with multiple `Student` instances.
- `src/example.ts` – Script that creates students, promotes them, and prints summaries.

## Concepts Practiced

- Defining and using **enums** for student status and grade level.
- Creating **interfaces** (`Person`, `StudentProps`, `Displayable`).
- Implementing interfaces in a **class** (`Student`).
- Using **getters and setters** for encapsulated state.
- Managing collections of class instances in a separate manager class.

## How to Run

From inside the `day06-ts-class` folder:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript project:
   ```bash
   npm run build
   ```

3. Run the example script:
   ```bash
   npm start
   ```

You should see logs showing students being added, promoted, and graduated, along with filtered lists of active students.
