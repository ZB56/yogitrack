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

## 3. Confirmation messages — DECIDED (2026-09-19), still a stub in Part 2
Put all messaging in its own module with a single interface (send to a person,
via their preferred contact, with this text). For Part 1 the module logs the
message and the UI displays it. For Part 2, wire in real delivery (e.g.
Nodemailer or SendGrid for email, Twilio for SMS). Keeping it a separate module
makes the swap easy. API keys go in environment variables, never in code.

Part 2 status: the module gained `sendStudioMessage` (UC2's confirmation to
the manager, which goes to the studio address because a login account carries
no contact details) and `checkInMessage` (UC6 step 10, in the specification's
own wording and dd/mm/yy format). Delivery is still logged rather than sent.
Real delivery needs a paid provider account and its API keys, which is a
studio purchasing decision rather than a development one; every call site
already goes through `sendMessage`, so the swap is one function body.

## 4. Representing "unlimited" class balance — DECIDED (2026-09-19)
**A flag plus date validity, not a sentinel number.** A package carries
`unlimited: true` with `numClasses: null`. Attendance (UC6) checks for an
active unlimited sale by date rather than decrementing a counter.

Rejected: a sentinel such as `numClasses: -1`. It reads as a bug to anyone
reviewing the code, and every balance check and every balance display would
need a special case for it. A boolean says what is actually meant.

## 5. Class duration for conflict checks — DECIDED (2026-10-15)
**A `durationMinutes` field on the class, defaulting to 60.**

UC2 requires that only one class be held at a time, but the specification
never gives a class length, and the rule cannot be tested without one. Sixty
minutes is the assumption for an ordinary class; making it a field rather
than a constant lets the studio's longer workshops say so, and the UML class
diagram already carried `durationMinutes` from Part 1.

Conflict detection is then the standard interval overlap test: two slots
clash when they are on the same day and A starts before B ends while B starts
before A ends. Touching ranges do not clash, so a 60 minute class at 09:00
leaves 10:00 free.

Related assumption: UC2 step 3 proposes alternatives inside a 06:00-21:00
studio day, because the requirements say the studio runs classes every day but
never give opening hours. That limits only what YogiTrack PROPOSES; a manager
may still enter any valid time.

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

**Part 2 outcome (2026-10-15): still add-only, by decision.** Part 2's effort
went to the four remaining use cases and to the authentication the Part 1
review asked for. Modify and delete appear in the course use-case diagram but
in none of the written use cases, and by Part 2 the referential-integrity
problem is real rather than hypothetical: classes reference instructors,
sales reference customers and packages, and attendance references all of
them, with a customer's class balance derived from that history. The
`active` flag is in every schema, so deactivation is a small change when a
written specification asks for it. Listed as a limitation in the report.

## 10. Diagram use cases with no written spec — DECIDED (2026-10-15)
**Out of scope. Not built as separate use cases.**

Publish Class Schedule, View Class Schedule and View Class Attendance appear
in the course use-case diagram and nowhere in the written specifications, so
there is nothing to build against: scope, actors and acceptance would all have
been invented. Building to an invented specification is a worse answer than
not building.

What the application does have, as a consequence of the written use cases
rather than as separate features: publishing is UC2 step 5 (saving a class
puts it in the schedule), the schedule is readable at /classes, and recorded
attendance is readable at /attendance. The mapping is stated in the project
report so a reader comparing the diagram to the application can see where
each box went.

## 11. Which reports to build — DECIDED (2026-10-15)
**The four reports written in UC7. The diagram's five are not built.**

The written use case is a specification; the diagram is a sketch with
different names and no definitions. So the application builds package sales,
instructors with their classes and check-ins, customers with their packages
(active, future, expired), and monthly teacher payment.

Mapping to the diagram's names, for a reader comparing the two:

| Diagram | Covered by |
|---|---|
| Studio Performance | Package sales report (revenue, units, by package) |
| Instructor Performance | Instructors report (classes led, classes held, check-ins) |
| Customer Attendance | Customers report, plus the attendance list |
| Class Attendance | The attendance list at /attendance |
| Instructor Self-Performance | Not built: it is the Instructor report filtered to one instructor, and no written use case asks for it |

## 12. Manager vs Instructor access — DECIDED (2026-10-15)
**Real accounts: bcrypt-hashed passwords, a signed JSON Web Token, and a role
checked on every protected request.**

Two actors means two sets of capabilities, and the Part 1 review asked for
authentication in the final submission. A role selector would have
demonstrated the two views, but anyone could switch it, so it is not
authentication and would not have answered the review.

What follows from it:
- A `users` collection: username, bcrypt hash (work factor 12, never
  returned by a query), role, and for an instructor the `instructorId` their
  account belongs to.
- A token rather than a server-side session, because a session needs a store
  and the Heroku dyno's filesystem is discarded daily. Lifetime eight hours,
  about one studio shift. The trade-off is that a token cannot be revoked
  before it expires, which is why it is short.
- The token is kept in `localStorage`. An httpOnly cookie would be safer
  against cross-site scripting, but brings CSRF protection with it; the
  reasoning is written out in `client/src/api/session.js` and the risk is
  listed in the report's limitations.
- Roles are enforced in `server/middleware/auth.js`, on the server. The React
  route guard and the role-filtered navigation only decide what is OFFERED.
- There is no sign-up page. A manager creates accounts, and the first manager
  comes from `npm run create:manager`, which reads the password from the
  environment and stores only the hash.

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

## 16. A sale snapshots the package it sold — DECIDED (2026-10-15)
**The sale copies the package's name, class count, unlimited flag and class
type at the moment it is recorded, as well as pointing at it by ID.**

A package is editable and a sale is a historical fact. If a sale held only a
`packageId`, raising the price of the 10 Class Pass would silently rewrite
every sale ever made of it, and the package sales report would show revenue
the studio never took. The duplication is deliberate and the field comments
in `server/models/Sale.js` say so.

The same reasoning decides what UC6 checks: "was this customer entitled to be
in that class on that date" has to be answered from what they bought then,
not from what the package says now.

## 17. Attendance records what a check-in did, not just who was there — DECIDED (2026-10-15)
**Each attendee on a sheet is a sub-document holding `usedUnlimited`,
`balanceBefore` and `balanceAfter`, rather than a bare customer ID.**

This is the one place the built model deliberately differs from the sketch in
`06-data-model.md`, which had `customerIds: []`. Two requirements force it.
UC6 step 8 allows a check-in that leaves a negative balance "to be resolved
later", and resolving it later is only possible if the sheet says what
happened. And an unlimited customer consumes nothing at all, so without
`usedUnlimited` a reader cannot tell a legitimate free check-in from a
balance that failed to decrement.

## 18. Class-type entitlement is a warning, not a block — DECIDED (2026-10-15)
**UC6 flags a customer with no active package of the class's type, but does
not stop the check-in.**

The requirements say a Special package admits its holder only to Special
classes. The data model the use cases specify keeps ONE class balance per
customer, not a balance per package type, so once a counted check-in is made
the system cannot tell which purchase it drew on. Blocking would be enforcing
a rule the data cannot actually support, and would wrongly refuse a customer
holding both a General and a Special package.

Flagging gives the instructor the fact and leaves the judgement with them.
The honest fix is per-package balances, which is a change to the specified
data model; it is listed as a limitation in the report rather than smuggled
in.
