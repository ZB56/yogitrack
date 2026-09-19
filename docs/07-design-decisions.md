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

## 4. Representing "unlimited" class balance — OPEN
A plain number can't represent it cleanly. Options: a sentinel value, or
tracking unlimited passes by validity dates on the sale record rather than by
balance. This affects UC5 and UC6, so decide before Part 2, and ideally before
finalizing the Package schema in Part 1.

## 5. Class duration for conflict checks — OPEN
UC2 requires that only one class be held at a time, but the spec gives no class
length. Either assume a fixed length (e.g. 60 or 75 minutes) or add a duration
field to the class. Document whichever is chosen as an assumption.

## 6. Use-case numbering — DECIDED
The course page has two "Use case 5"s. The report numbers them 1–7 and notes
the correction. See `04-use-cases.md`.

## 7. Part 1 deployment target — OPEN
zyLabs (quick, no Git/Heroku setup) or Heroku (full pipeline, which Part 2
requires anyway).

## 8. Project folder structure — RECOMMENDED
No structure or starter code is prescribed. Single repo, Express at the root,
React in `client/`, Express serves the React build in production. See
`09-project-structure.md`.

## 9. Add only, or Add/Modify/Delete — OPEN
The use-case diagram shows Add/Modify/Delete for instructor, class, package, and
customer; the written specs describe only Add. Suggested approach: implement the
written Add flows first and exactly as specified, then add modify and delete,
since full CRUD over REST is a natural demonstration of the stack. Note that
delete needs a rule for records that are referenced elsewhere (e.g. an
instructor who has classes, a package that has sales): block it, or mark the
record inactive instead of removing it.

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
