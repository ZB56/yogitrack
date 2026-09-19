# YogiTrack — project context for Claude Code

This file is read automatically at the start of every session. The full source
material is in `docs/`. Read `docs/04-use-cases.md` before building any use case.

## What this is
A course project for ACS 5423 (Software Development for World Wide Web),
University of Oklahoma. The app, **YogiTrack**, automates record-keeping for the
Yoga H'om studio: instructors, customers, class packages, class schedule,
attendance, and reports. It must be built on the **MERN stack**.

## About the developer
- Brand new to coding. Some Java background, so Java analogies help
  (Mongoose schema ~ class definition, document ~ instance, etc.).
- Needs to understand and be able to defend every design decision in a written
  project report. **Explain each file as you create it**: what it does, why it
  exists, how it connects to the others. Call out things that differ from Java,
  especially async/await, callbacks/promises, and React component state.
- Prefer clear, conventional code over clever code. Comment well; commenting and
  conventions are graded.

## How to work
- Build **one use case at a time**, end to end (model -> route -> React form ->
  validation), and stop so it can be tested and committed before moving on.
- After each working piece, suggest a meaningful commit message. Regular commits
  with meaningful messages are graded. Do not batch the whole app into one commit.
- Do not enter or store credentials. The developer handles Atlas, Heroku, and
  GitHub logins and sets secrets. Use a `.env` file (git-ignored) and
  `process.env` for connection strings and keys; provide a `.env.example`.
- Academic integrity: the course permits open-book research and prohibits peer
  help and reuse of prior work. Its policy on AI tools is not stated in the
  materials here; the developer is confirming it. Keep the work explainable.

## Tech stack (required by the course)
- MongoDB (local via mongosh / Compass for dev, MongoDB Atlas in the cloud)
- Express + Node.js backend, Mongoose for models
- React frontend
- Git + GitHub, Heroku for deployment (Eco dyno), CI/CD pipeline for Part 2
- VSCode as the editor

## Plan
- **Part 1 (due Sunday, Week 4, 11:59 pm CT):** Add Instructor (UC1),
  Add Customer (UC4), Add Package (UC3). Deploy on zyLabs or Heroku. Project report.
- **Part 2 (due Friday, Week 8, 11:59 pm CT):** Add Class (UC2), Record Sale (UC5),
  Record Attendance (UC6), Reports (UC7). GitHub repo, Heroku deploy, CI/CD
  pipeline, updated report.

See `docs/05-build-plan.md`, `docs/06-data-model.md`, and
`docs/07-design-decisions.md` for detail. Items in the design-decisions file
marked OPEN have not been decided yet; ask before assuming.

## Structure and scope notes
- The course prescribes no folder structure and no starter code. Follow
  `docs/09-project-structure.md` unless the developer says otherwise.
- The course use-case diagram is in `docs/08-use-case-diagram.md` (image:
  `docs/fig5-use-case-diagram.png`). It is broader than the written use cases
  (Add/Modify/Delete rather than Add, extra view/publish use cases, a different
  report list, two actors with no auth spec). Those gaps are OPEN decisions
  9-12 in `docs/07-design-decisions.md`. Build the written specs first.

## Grading reminders (25 pts per part, 5 each)
Use cases, tech-stack use, UI design (intuitive, responsive), code/GitHub
(working, commented, organized, informative README, regular commits), project
report. Full rubric in `docs/01-project-scope-and-deliverables.md`.
