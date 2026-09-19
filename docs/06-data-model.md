# Data model sketch

Six collections plus one helper. This is a starting sketch, not final.

    instructors   instructorId ("I00123"), firstName, lastName, address,
                  phone, email, preferredContact ("phone" | "email")

    customers     customerId ("C00123"), firstName, lastName, address,
                  phone, email, preferredContact ("phone" | "email"),
                  classBalance (Number, starts at 0)

    packages      packageId, name, category ("General" | "Senior"),
                  numClasses (1 | 4 | 10 | unlimited),
                  classType ("General" | "Special"),
                  startDate, endDate, price

    classes       classId, instructorId, day, time,
                  classType ("General" | "Special"), payRate

    sales         saleId, customerId, packageId, amountPaid, paymentMode,
                  paidAt, validFrom, validTo

    attendance    classId, instructorId, heldAt, customerIds [ ]

    counters      one document per ID type, holding the last number used

Notes:
- Each Mongoose schema is roughly a Java class definition; each document is an
  instance.
- References between collections (a sale holding a customerId) work like foreign
  keys, but MongoDB does not enforce them. The Express code must check that the
  referenced record exists.
- Required fields and enums ("phone" | "email", "General" | "Special") should be
  enforced in the Mongoose schema as well as in the React form.
