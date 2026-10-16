# Data model

Seven collections plus one helper. This was a sketch during Part 1; it now
describes what is built, with the places the build differs from the original
sketch called out.

    users         username, passwordHash (bcrypt), role ("manager" |
                  "instructor"), instructorId (instructor accounts only),
                  active, lastLoginAt

    instructors   instructorId ("I00123"), firstName, lastName, address,
                  phone, email, preferredContact ("phone" | "email"), active

    customers     customerId ("C00123"), firstName, lastName, address,
                  phone, email, preferredContact ("phone" | "email"),
                  classBalance (Number, starts at 0, may go negative), active

    packages      packageId ("P00123"), name, category ("General" | "Senior"),
                  numClasses (1 | 4 | 10, null when unlimited),
                  unlimited (Boolean), classType ("General" | "Special"),
                  startDate, endDate, price, active

    classes       classId ("L00123"), instructorId, day, time ("HH:MM"),
                  durationMinutes (default 60),
                  classType ("General" | "Special"), payRate, active

    sales         saleId ("S00123"), customerId, packageId,
                  packageName, classesPurchased, unlimited, classType,
                  amountPaid, paymentMode ("Cash" | "Card" | "Check"),
                  paidAt, validFrom, validTo

    attendance    attendanceId ("A00123"), classId, instructorId, heldAt,
                  attendees [ { customerId, usedUnlimited,
                                balanceBefore, balanceAfter } ]

    counters      one document per ID type, holding the last number used

## Changes from the Part 1 sketch

- **`users` is new.** Design decision 12: the course names two actors but no
  document says how one is told from the other, and the Part 1 review asked
  for authentication. An instructor account points at its instructor record
  by `instructorId` rather than copying the demographic data.

- **`classes` gained `durationMinutes`** (decision 5). UC2's "only one class
  at a time" cannot be tested without a length.

- **`sales` carries a snapshot of the package**: `packageName`,
  `classesPurchased`, `unlimited` and `classType` as they were at the moment
  of sale (decision 16). A package is editable; a sale is history.

- **`attendance` holds sub-documents, not a `customerIds` array**
  (decision 17). Each row records whether the check-in was covered by an
  unlimited package and what the balance went from and to, which is what
  makes UC6 step 8's negative balance resolvable later.

## Notes

- Each Mongoose schema is roughly a Java class definition; each document is
  an instance.
- References between collections (a sale holding a `customerId`) work like
  foreign keys, but **MongoDB does not enforce them**. Every controller that
  accepts a reference checks the referenced record exists first; the error
  messages ("No customer with that id") come from those checks.
- The readable IDs (I/C/P/L/S/A) are separate from MongoDB's own `_id`. The
  `_id` is right for the database; `I00123` is what a manager reads over the
  phone. Both are kept.
- Required fields and enums are enforced in the Mongoose schema as well as in
  the React form. The schema is the authority; the form only saves a round
  trip.
- `classBalance` has deliberately **no minimum**. UC6 step 8 requires that an
  instructor be able to check in a customer who has run out, leaving a
  negative balance to be settled later.

## Indexes

Added where a query runs on every request rather than occasionally:

| Collection | Index | Why |
|---|---|---|
| instructors, customers | `{ lastName, firstName }` | the duplicate-name check in UC1 and UC4 step 2 |
| users | `{ username }` (unique) | every sign-in |
| packages | `{ category, classType }` | filtering packages when recording a sale |
| classes | `{ day, time }` | UC2's conflict check reads one day at a time |
| classes | `{ instructorId }` | UC6 step 2 lists an instructor's own classes |
| sales | `{ customerId, validTo }` | entitlement at check-in, and two UC7 reports |
| sales | `{ paidAt }` | the sales report's sort order |
| attendance | `{ classId, heldAt }`, `{ instructorId, heldAt }` | UC7's check-in counts and the monthly payment report |
| attendance | `{ attendees.customerId }` | a customer's attendance history |
