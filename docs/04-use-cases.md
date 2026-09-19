# Project Use Cases (course document)

Numbering note: the original course page labels both "Record a Sale" and
"Record class attendance" as Use case 5, and Reports as Use case 6. They are
renumbered 1–7 here. Original labels are shown in parentheses.

## UC1. Add an instructor (original: Use case 1)
**Actor:** Manager
**Description:** The manager adds a new instructor and enters:
- First name, last name
- Address
- Phone
- Email
- Preferred mode of communication (phone or email)

**Basic flow** (numbered as in the course specification: the duplicate-name
prompt is a sub-flow of step 2, not a step of its own)
1. The manager selects the option to create a new instructor and enters their
   first and last name.
2. YogiTrack checks and confirms that the instructor name does not already exist.
   - **2a.** If the instructor name already exists, YogiTrack prompts to
     confirm, as there may be more than one instructor with the same name.
3. YogiTrack generates a new instructor ID.
4. The manager enters the rest of the demographic data and saves.
5. YogiTrack validates the data and prompts if any required fields are missing.
6. YogiTrack confirms the record has been saved.
7. YogiTrack sends a confirmation message to the instructor on the preferred
   mode of communication: "Welcome to Yoga'Hom! ... Your instructor id is I00123."

Note: the first letter of an instructor ID is **I**, to differentiate from a
customer ID, which starts with **C**.

## UC2. Add a class (original: Use case 2)
**Actor:** Manager
**Description:** The manager adds a new class to the schedule with:
- Instructor Id
- Day, time
- Class type (General or Special)
  - A General class is open to any customer with a package of 'General' classes.
  - A Special series of classes needs a package with 'Special' class type,
    e.g. 'Yoga with weights'.
- Pay rate

**Basic flow**
1. The manager chooses the option to create a new class and enters the data above.
2. YogiTrack checks for a schedule conflict, as only one class can be held at
   any time.
3. If there is a conflict, YogiTrack suggests other options in the calendar.
4. The manager selects one of the options.
5. The manager confirms and publishes the schedule.
6. YogiTrack sends a confirmation message to the manager and to the instructor
   that a new class has been successfully scheduled.

## UC3. Add a package (original: Use case 3)
**Actor:** Manager
**Description:** The manager adds a new package with:
- Package name
- Package category: General or Senior
- Number of classes: 1, 4, 10, or unlimited
- Class type: General or Special (a 'General' package allows any 'General'
  class; a 'Special' package allows only classes marked 'Special')
- Start date
- End date
- Price

**Basic flow**
1. The manager chooses the option to add a new package and enters the data above.
2. YogiTrack generates a new package Id and displays a confirmation prompt that
   the package has been added.

## UC4. Add a customer (original: Use case 4)
**Actor:** Manager
**Description:** The manager adds a new customer with:
- First name, last name
- Address
- Phone
- Email
- Preferred mode of communication (phone or email)
- Class balance (initial value 0)

**Basic flow** (same seven steps as UC1)
1. The manager chooses the option to create a new customer and enters the first
   and last name.
2. YogiTrack checks and confirms that the customer name does not already exist.
   - **2a.** If the name already exists, YogiTrack prompts to confirm, as there
     may be more than one customer with the same name.
3. YogiTrack generates a new customer ID.
4. The manager enters the rest of the data and saves.
5. YogiTrack validates the data and prompts if any required fields are missing.
6. YogiTrack confirms the record has been saved.
7. YogiTrack sends a confirmation message to the customer on their preferred
   mode of communication: "Welcome to Yoga'Hom! ... Your customer id is C00123."

Note: the first letter of a customer ID is **C**.

## UC5. Record a sale (original: Use case 5)
**Actor:** Manager
**Description:** The manager records a sale of a package to an existing customer:
- Type of package
- Amount paid
- Mode of payment
- Date and time of payment
- Validity start and end date

**Basic flow**
1. The manager chooses the option to record a new sale.
2. YogiTrack prompts with options to enter the data above and auto-populates
   'Type of package'.
3. The manager enters the data.
4. YogiTrack validates the data:
   - Amount paid is as per the package rate.
   - Date and time are current.
   - Start and end dates are as per the package rules and are current.
5. YogiTrack updates the class balance for the customer based on the package bought.
6. YogiTrack displays the new class balance and confirms the sale has been recorded.

## UC6. Record class attendance (original: second "Use case 5")
**Actor:** Instructor
**Description:** The instructor marks customers attending the class as present.
This updates the class balance for the customers depending on the package they
have bought.

**Basic flow**
1. The instructor chooses the option to enter class attendance.
2. YogiTrack displays the list of classes assigned to / led by the instructor.
3. The instructor chooses the class.
4. YogiTrack displays the attendance form with current date and time, with an
   option to change it as needed.
5. YogiTrack displays a warning if the date and time do not match the class
   schedule (e.g. class scheduled Mon 9am but the sheet says Tue 9am).
6. The instructor chooses customer names from the customer list and adds them
   to the class.
7. Once all names have been added, the instructor chooses to save the attendance.
8. YogiTrack validates against each customer's class balance and indicates if a
   customer does not have the required balance. In that case YogiTrack gives the
   option to continue and save the customer record with a negative balance, to
   be resolved later.
9. If all data is valid, YogiTrack provides the option to save the attendance form.
10. YogiTrack updates the class balance for all customers and sends a check-in
    confirmation with updated balance to each attending customer:
    "Hello 'firstName'! You are checked-in for a class on dd/mm/yy at hh:mm
    am/pm. Your class-balance is XXX."

## UC7. Generate studio reports (original: Use case 6)
- Package sales report
- Instructors list with their list of classes and their number of check-ins
- Customer list with their list of packages (active, future, or expired)
- Teacher payment report for each month based on the pay-rate and class check-ins
