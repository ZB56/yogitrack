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
- **Part 1 (submitted, 25/25):** UC1 Add Instructor, UC4 Add Customer, UC3
  Add Package, deployed to Heroku with a GitHub repo and CI. Feedback from
  the instructor: liked the response time; "for the final submission have
  authentication implemented".
- **Part 2 (due Friday, Week 8, 11:59 pm CT): all seven use cases are now
  implemented.** Part 2 added UC2 Add Class (schedule conflict and suggested
  slots), UC5 Record Sale, UC6 Record Attendance, UC7's four reports as
  MongoDB aggregations, and authentication with roles (decision 12), which is
  what the Part 1 feedback asked for.

Scope decisions the developer made for Part 2, deliberately:
- Still **add-only**: no modify or delete. No written use case asks for them,
  and by Part 2 the referential-integrity problem is real. Decision 9.
- The **diagram-only** use cases (Publish/View Schedule, View Attendance) are
  out of scope: there is no written specification to build against.
  Decision 10.
- Only the **four written UC7 reports**, not the diagram's different five.
  Decision 11.
- Messaging is still a **logging stub**: real delivery needs a paid provider
  account. Decision 3.

See `docs/05-build-plan.md`, `docs/06-data-model.md`, and
`docs/07-design-decisions.md` for detail. All 18 decisions are now settled;
read the reasoning before changing any of them.

Local MongoDB is NOT a Homebrew service on this machine (Homebrew is blocked
by outdated Command Line Tools). It runs from unpacked binaries outside the
repo; the start command is in the README.

Authentication: every API route except `/api/health` and `/api/auth/login`
needs a bearer token. Locally, `.env` holds `JWT_SECRET` and the test manager
login; `npm run create:manager` creates or resets a manager account from
environment variables. Never put a password in a file that is not git-ignored,
and never in a commit message or a log line.

The report is built with `python3 tools/build-report.py`, which regenerates
`docs/project-report.html` from the Markdown source. Re-run it after editing
the report.

Step numbers in code comments and the report follow the COURSE specification's
numbering (UC1/UC4 are seven steps, with the duplicate-name prompt as sub-step
2a). Do not renumber them; a grader may check them against the source.

`npm run seed:packages` loads the studio's seven real packages from Fig. 2.
`npm run lint --prefix client` should stay clean; CI runs it.

## Structure and scope notes
- The course prescribes no folder structure and no starter code. Follow
  `docs/09-project-structure.md` unless the developer says otherwise.
- The course use-case diagram is in `docs/08-use-case-diagram.md` (image:
  `docs/fig5-use-case-diagram.png`). It is broader than the written use cases
  (Add/Modify/Delete rather than Add, extra view/publish use cases, a different
  report list, two actors with no auth spec). Those gaps are settled as
  decisions 9-12 in `docs/07-design-decisions.md`: the written specifications
  are what is built, authentication is real, and the rest is deliberately out
  of scope with the reasoning recorded.

## Grading reminders (25 pts per part, 5 each)
Use cases, tech-stack use, UI design (intuitive, responsive), code/GitHub
(working, commented, organized, informative README, regular commits), project
report. Full rubric in `docs/01-project-scope-and-deliverables.md`.
