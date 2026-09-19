# UML models

Four models describe YogiTrack. Each is an SVG in `diagrams/`, drawn by hand so
the layout stays readable and the notes can carry the reasoning. PlantUML
source is included underneath each one so the diagrams can be regenerated or
edited later (render at plantuml.com or with the VSCode PlantUML extension).

| Model | File | Answers |
|---|---|---|
| Use-case diagram | `diagrams/use-case-diagram.svg` | Who uses the system, and what can they do? |
| Class diagram | `diagrams/class-diagram.svg` | What data does it hold, and how is it related? |
| Sequence diagram | `diagrams/sequence-uc1-add-instructor.svg` | What happens, in order, when a use case runs? |
| Architecture & deployment | `diagrams/architecture.svg` | What are the parts, and where do they run? |

---

## 1. Use-case diagram

![Use-case diagram](diagrams/use-case-diagram.svg)

Two actors. The **Manager** does everything to do with records and money; the
**Instructor** records attendance for their own classes. The four report
variants are drawn as specialisations of UC7 "Generate studio reports",
matching the structure of the course's own Fig. 5.

Shaded ellipses are delivered in Part 1; dashed ones are Part 2.

This diagram covers the **written** specification in `04-use-cases.md`. The
course's Fig. 5 is broader — it shows Add/Modify/Delete, two view-only use
cases and a different set of report names. That gap is deliberate, catalogued
in `08-use-case-diagram.md` and tracked as open decisions 10–12.

### PlantUML source

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
actor Manager
actor Instructor

rectangle YogiTrack {
  usecase "UC1 Add an instructor"      as UC1
  usecase "UC4 Add a customer"         as UC4
  usecase "UC3 Add a package"          as UC3
  usecase "UC2 Add a class"            as UC2
  usecase "UC5 Record a sale"          as UC5
  usecase "UC6 Record class attendance" as UC6
  usecase "UC7 Generate studio reports" as UC7

  usecase "Package sales"                  as R1
  usecase "Instructors, classes, check-ins" as R2
  usecase "Customers and their packages"    as R3
  usecase "Monthly teacher payment"         as R4
}

Manager --> UC1
Manager --> UC4
Manager --> UC3
Manager --> UC2
Manager --> UC5
Manager --> UC7
Instructor --> UC6

R1 --|> UC7
R2 --|> UC7
R3 --|> UC7
R4 --|> UC7

note bottom of UC1 : Part 1
note bottom of UC4 : Part 1
note bottom of UC3 : Part 1
@enduml
```

---

## 2. Class diagram

![Class diagram](diagrams/class-diagram.svg)

Seven collections: six domain entities plus `counters`, which is infrastructure
rather than domain data but is shown because it is a real collection that the
ID generator depends on.

Three things worth pointing out to anyone reading this from a Java background:

- **A Mongoose schema is the class definition; a document is an instance.**
  The model object that `mongoose.model()` returns is what you call the static
  methods on (`Instructor.find()`), much like a Java class object.
- **`«FK»` is a convention, not a constraint.** MongoDB will happily store a
  `customerId` that matches no customer. There is no foreign-key enforcement
  and no `JOIN`. Wherever a reference matters, the Express controller has to
  check that the target exists — the database will not do it.
- **`/ fullName` is a derived attribute** (UML notation for a computed value).
  In Mongoose it is a *virtual*: a getter with no stored field behind it.

### PlantUML source

```plantuml
@startuml
hide circle
skinparam classAttributeIconSize 0

class Instructor {
  - instructorId : String {unique}
  - firstName : String
  - lastName : String
  - address : String
  - phone : String
  - email : String
  - preferredContact : ContactMode
  - active : Boolean
  + /fullName : String
}

class Customer {
  - customerId : String {unique}
  - firstName : String
  - lastName : String
  - address : String
  - phone : String
  - email : String
  - preferredContact : ContactMode
  - classBalance : Number
  + /fullName : String
}

class Package {
  - packageId : String {unique}
  - name : String
  - category : PackageCategory
  - numClasses : Number
  - unlimited : Boolean
  - classType : ClassType
  - startDate : Date
  - endDate : Date
  - price : Number
}

class Class {
  - classId : String {unique}
  - instructorId : String
  - day : String
  - time : String
  - durationMinutes : Number
  - classType : ClassType
  - payRate : Number
}

class Sale {
  - saleId : String {unique}
  - customerId : String
  - packageId : String
  - amountPaid : Number
  - paymentMode : String
  - paidAt : Date
  - validFrom : Date
  - validTo : Date
}

class Attendance {
  - classId : String
  - instructorId : String
  - heldAt : Date
  - customerIds : String[]
}

class Counter {
  - _id : String
  - seq : Number
}

enum ContactMode { phone
email }
enum ClassType { General
Special }
enum PackageCategory { General
Senior }

Instructor "1" --> "0..*" Class : teaches
Customer   "1" --> "0..*" Sale : buys
Package    "1" --> "0..*" Sale : sold as
Class      "1" --> "0..*" Attendance : held as
Instructor "1" --> "0..*" Attendance : records
Customer   "1" --> "0..*" Attendance : attends

note right of Counter
  Supplies every I/C/P/L/S id
  by atomic $inc. Infrastructure,
  not a domain entity.
end note
@enduml
```

---

## 3. Sequence diagram — UC1, Add an instructor

![UC1 sequence diagram](diagrams/sequence-uc1-add-instructor.svg)

UC1 was chosen for the sequence diagram because it is the only Part 1 use case
with a branch in it: the duplicate-name confirmation. The numbered green labels
tie each message back to a step in the written use case, so the diagram can be
read side by side with `04-use-cases.md`.

Two details the diagram is specifically there to make visible:

- **The `alt` fragment** is the two-step duplicate interaction (design decision
  2). The form asks the server whether the name exists *before* it tries to
  save. Only a match produces a prompt. Two instructors genuinely may share a
  name, so this is a question, not a rejection.
- **Validation (message 10) happens before ID generation (message 11).** This
  ordering is not cosmetic; see the note on the diagram and design decision 15.

### PlantUML source

```plantuml
@startuml
actor Manager
participant "AddInstructor.jsx" as Form
participant "instructorController.js" as Ctrl
participant "idGenerator / messaging" as Svc
database "MongoDB" as DB

Manager -> Form : enter details, click Save
Form -> Form : validateForm(values)
Form -> Ctrl : GET /api/instructors/check-name
Ctrl -> DB : Instructor.find({ name })
DB --> Ctrl : matching documents
Ctrl --> Form : { exists, count, matches }

alt a match already exists
  Form --> Manager : "this name exists, add anyway?"
  Manager -> Form : confirm
else no match
end

Form -> Ctrl : POST /api/instructors
Ctrl -> Ctrl : instructor.validate()
Ctrl -> Svc : generateId('instructor')
Svc -> DB : findOneAndUpdate($inc)
DB --> Svc : { seq: 1 }
Svc --> Ctrl : "I00001"
Ctrl -> DB : instructor.save()
DB --> Ctrl : saved document
Ctrl -> Svc : sendMessage(instructor, welcome)
Svc --> Ctrl : notification record
Ctrl --> Form : 201 Created
Form --> Manager : confirmation, id, message preview

note over Ctrl
  Validation runs before the counter is
  touched, so a rejected form never
  consumes an id number.
end note
@enduml
```

---

## 4. Architecture and deployment

![Architecture and deployment](diagrams/architecture.svg)

Three views in one figure:

1. **Component view** — the path a single request takes through the folders of
   the repository. Every use case follows this same path, which is the point of
   organising the server into `routes / controllers / services / models`
   instead of putting the logic in one file.
2. **Deployment view** — development versus production. The interesting part is
   what *changes*: in development two processes run on two ports and Vite
   proxies `/api` to Express; in production one Heroku process serves both the
   compiled React build and the API. Because the frontend only ever uses
   relative URLs, no application code differs between the two.
3. **Delivery pipeline** — commit, push, build and test, then release.

### PlantUML source (deployment view)

```plantuml
@startuml
node "Developer laptop" {
  artifact "Browser :5173" as B1
  node "Vite dev server" as V
  node "Express :5001" as E1
  database "MongoDB :27017" as D1
  B1 --> V
  V --> E1 : proxy /api
  E1 --> D1
}

cloud "Heroku" {
  node "Eco dyno" as Dyno {
    artifact "client/dist (static)" as Build
    component "Express + API" as E2
  }
}
cloud "MongoDB Atlas" {
  database "yogitrack cluster" as D2
}
artifact "Browser (any device)" as B2

B2 --> Dyno : https
E2 --> D2 : mongodb+srv
E2 --> Build : serves
@enduml
```
