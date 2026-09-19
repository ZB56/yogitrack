# Fig. 5 — Use-case diagram (course document)

Image: `fig5-use-case-diagram.png` (same folder). Text transcription below so it
can be read without opening the image.

## System boundary: YogiTrack

### Actor: Manager
- Generate Studio Reports
- Add/Modify/Delete Instructor
- Add/Modify/Delete Class
- Add/Modify/Delete Package
- Add/Modify/Delete Customer
- Record a Sale
- Publish Class Schedule
- View Class Attendance

### Actor: Instructor
- View Class Attendance (shared with Manager)
- Record Class Attendance
- View Class Schedule
- Generate Self-Performance Report

### Generalization
Four use cases specialize "Generate Studio Reports" (hollow-triangle arrows
pointing at the parent):
- Generate Studio Performance Report
- Generate Instructor Performance Report
- Generate Customer Attendance Report
- Generate Class Attendance Report

## PlantUML source (reconstruction)
The original looks like PlantUML output. This source reproduces it and can be
edited for the project report (render at plantuml.com or with the VSCode
PlantUML extension).

```plantuml
@startuml
left to right direction
actor Manager
actor Instructor

rectangle YogiTrack {
  usecase "Generate Studio Reports" as Reports
  usecase "Add/Modify/Delete Instructor" as Inst
  usecase "Add/Modify/Delete Class" as Cls
  usecase "Add/Modify/Delete Package" as Pkg
  usecase "Add/Modify/Delete Customer" as Cust
  usecase "Record a Sale" as Sale
  usecase "Publish Class Schedule" as Publish
  usecase "View Class Attendance" as ViewAtt
  usecase "Record Class Attendance" as RecAtt
  usecase "View Class Schedule" as ViewSched
  usecase "Generate Self-Performance Report" as SelfRep

  usecase "Generate Studio Performance Report" as R1
  usecase "Generate Instructor Performance Report" as R2
  usecase "Generate Customer Attendance Report" as R3
  usecase "Generate Class Attendance Report" as R4
}

Manager --> Reports
Manager --> Inst
Manager --> Cls
Manager --> Pkg
Manager --> Cust
Manager --> Sale
Manager --> Publish
Manager --> ViewAtt

Instructor --> ViewAtt
Instructor --> RecAtt
Instructor --> ViewSched
Instructor --> SelfRep

R1 --|> Reports
R2 --|> Reports
R3 --|> Reports
R4 --|> Reports
@enduml
```

## Where the diagram and the written use cases disagree
The diagram is broader than the written specs in `04-use-cases.md`. These gaps
are tracked as decisions in `07-design-decisions.md`.

1. **Add vs Add/Modify/Delete.** The diagram shows full add/modify/delete for
   instructor, class, package, and customer. The written specs describe only
   "Add".
2. **Publish Class Schedule** is its own use case in the diagram. In the written
   specs it is only step 5 of UC2 (Add a class).
3. **View Class Attendance** (Manager and Instructor) and **View Class Schedule**
   (Instructor) appear in the diagram with no written spec.
4. **Reports don't match.** Diagram: Studio Performance, Instructor Performance,
   Customer Attendance, Class Attendance, plus an instructor Self-Performance
   report. Written UC7: package sales, instructor list with classes and
   check-ins, customer list with packages (active/future/expired), monthly
   teacher payment.
5. **Two actors** implies the app presents different capabilities to a Manager
   and an Instructor. Neither document says how users are identified (login or
   otherwise).
