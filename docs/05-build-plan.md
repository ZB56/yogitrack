# Build plan

## Why this order
The use cases form a dependency tree:

    Instructor ──> Class ──────────┐
    Package ───┐                   ├──> Attendance ──> Reports
    Customer ──┴──> Sale ──────────┘

You can't add a class without an instructor, can't record a sale without a
customer and a package, and can't take attendance without all of them. Building
the roots first makes Part 2 purely additive.

## Part 1 — due Sunday, Week 4
Build UC1 (Add Instructor), UC4 (Add Customer), UC3 (Add Package). The rubric
requires at least two.

- Instructor and Customer are about 90% the same code (same fields, same
  duplicate-name check, same ID generation, same welcome message). Build the
  full MERN pattern once, then repeat it.
- Package is a simple form with no branching flow.

Steps:
1. Set up the repo; bare Express server connected to local MongoDB.
2. UC1 Instructor end to end: Mongoose model, Express routes (including the
   name-lookup endpoint), React form, validation, confirmation message.
3. UC4 Customer, following the same pattern.
4. UC3 Package.
5. Shared layout/navigation and responsive styling pass.
6. Deploy (zyLabs or Heroku) and write the project report: use cases, design
   decisions, UML models.

Commit after every working piece with a message describing what it does.

## Part 2 — due Friday, Week 8
1. UC2 Add Class (schedule conflict check and alternative suggestions).
2. UC5 Record Sale (validation against package, balance update).
3. UC6 Record Attendance (instructor view, schedule-mismatch warning,
   negative-balance override, check-in messages).
4. UC7 Reports (MongoDB aggregation pipelines are a good fit and demonstrate
   the stack).
5. GitHub repo, Atlas, Heroku deployment, CI/CD pipeline.
6. Real message delivery if stubbed in Part 1.
7. Updated project report.
