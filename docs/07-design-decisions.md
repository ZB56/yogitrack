# Design decisions the spec leaves open

These belong in the "key design decisions" section of the project report.
Status is RECOMMENDED (a suggested approach, not yet confirmed by the developer)
or OPEN (undecided). Ask before assuming on OPEN items.

## 1. ID generation — RECOMMENDED
Use a `counters` collection with an atomic increment (`findOneAndUpdate` with
`$inc`), then format as prefix + zero-padded number (I00123, C00123). Do not
count documents and add one; two simultaneous saves would collide.

## 2. Duplicate-name flow — RECOMMENDED
It is a two-step interaction. The form first checks the name against the server
via a separate lookup endpoint. Only if a match exists does the UI show a
"someone with this name already exists, continue?" prompt. Then the save proceeds.

## 3. Confirmation messages — RECOMMENDED
Put all messaging in its own module with a single interface (send to a person,
via their preferred contact, with this text). For Part 1 the module logs the
message and the UI displays it. For Part 2, wire in real delivery (e.g.
Nodemailer or SendGrid for email, Twilio for SMS). Keeping it a separate module
makes the swap easy. API keys go in environment variables, never in code.

## 4. Representing "unlimited" class balance — DECIDED (2026-09-19)
**A flag plus date validity, not a sentinel number.** A package carries
`unlimited: true` with `numClasses: null`. Attendance (UC6) checks for an
active unlimited sale by date rather than decrementing a counter.

Rejected: a sentinel such as `numClasses: -1`. It reads as a bug to anyone
reviewing the code, and every balance check and every balance display would
need a special case for it. A boolean says what is actually meant.

## 5. Class duration for conflict checks — OPEN
UC2 requires that only one class be held at a time, but the spec gives no class
length. Either assume a fixed length (e.g. 60 or 75 minutes) or add a duration
field to the class. Document whichever is chosen as an assumption.

## 6. Use-case numbering — DECIDED
The course page has two "Use case 5"s. The report numbers them 1–7 and notes
the correction. See `04-use-cases.md`.

## 7. Part 1 deployment target — DECIDED (2026-09-19)
**Heroku.** Part 2 requires a GitHub repo, a Heroku deployment and a CI/CD
pipeline regardless, so building that pipeline once for Part 1 avoids doing
the work twice. Cost is the Eco dyno, about $5/month.

Consequence for the code: the repo is structured so Express serves the
compiled React build in production (see server.js), giving Heroku one web
process rather than two.

## 8. Project folder structure — RECOMMENDED
No structure or starter code is prescribed. Single repo, Express at the root,
React in `client/`, Express serves the React build in production. See
`09-project-structure.md`.

## 9. Add only, or Add/Modify/Delete — DECIDED (2026-09-19)
**Part 1: the written Add flows, plus a read-only list view per resource.
Part 2: modify and delete.**

The written specs describe only Add, so Part 1 implements those exactly.
A list view is added beyond the spec because without one nothing that was
saved is ever visible, which would cost marks on UI design for no good reason.

Modify and delete are deferred to Part 2 deliberately, not forgotten: delete
needs a referential-integrity rule first (an instructor who has classes, a
package that has sales), and there are no classes or sales to protect until
Part 2 exists. The planned rule is to deactivate rather than remove, which is
why `Instructor.active` already exists in the schema.

## 10. Diagram use cases with no written spec — OPEN
Publish Class Schedule, View Class Schedule, and View Class Attendance appear in
the diagram only. Decide whether they are in scope for Part 2 and write short
specs for them in the report if so.

## 11. Which reports to build — OPEN
The diagram's report names (Studio Performance, Instructor Performance, Customer
Attendance, Class Attendance, instructor Self-Performance) do not match the four
listed in written UC7 (package sales, instructor list with classes and
check-ins, customer list with packages, monthly teacher payment). Worth asking
the professor which list governs; otherwise build the written UC7 list and
document the mapping to the diagram as an assumption.

## 12. Manager vs Instructor access — OPEN
Two actors means two sets of capabilities, but no document specifies
authentication. Options range from a simple role selector (enough to demonstrate
the two views) to real login with hashed passwords and protected routes. Decide
before building UC6, the first instructor-facing use case.

## 13. Module system — DECIDED (2026-09-19)
**ES modules (`import`/`export`) throughout, server and client.**
`package.json` sets `"type": "module"`.

Many MERN tutorials use CommonJS `require` on the server and `import` on the
React side. One syntax across the whole codebase is less to keep straight, and
ES modules are the current standard for Node. Consequence: `__dirname` does not
exist and is reconstructed from `import.meta.url` in server.js.

## 14. Address as a single field — DECIDED (2026-09-19)
UC1 and UC4 list "Address" as one item, so it is stored as one free-text
string rather than split into street / city / state / ZIP. Recorded here as an
assumption. Splitting it later is a schema change plus a data migration, so if
the reports in UC7 ever need to group customers by city, revisit this first.

## 15. Validate before generating an ID — DECIDED (2026-09-19)
The controller validates the whole record and only then calls the counter.

Generating the ID first is the obvious order and it is wrong: a rejected form
would consume a counter number, so a manager who mistypes twice would see the
next instructor saved as I00004 instead of I00002. The gaps are harmless to the
database but look like lost records to the studio. Caught by testing, and the
reason `Instructor.validate({ pathsToSkip: ['instructorId'] })` appears in
instructorController.js.
