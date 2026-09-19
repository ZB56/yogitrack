# YogiTrack

A web application that replaces the paper record-keeping at the **Yoga H'om**
yoga studio: instructors, customers, class packages, the class schedule,
attendance, and studio reports.

Course project for **ACS 5423 — Software Development for World Wide Web**,
University of Oklahoma. Built on the MERN stack (MongoDB, Express, React, Node).

## Status

| Use case | Description | Part | Status |
|---|---|---|---|
| UC1 | Add an instructor | 1 | Backend complete |
| UC4 | Add a customer | 1 | Not started |
| UC3 | Add a package | 1 | Not started |
| UC2 | Add a class | 2 | Not started |
| UC5 | Record a sale | 2 | Not started |
| UC6 | Record class attendance | 2 | Not started |
| UC7 | Studio reports | 2 | Not started |

Full specifications are in [`docs/04-use-cases.md`](docs/04-use-cases.md).

## Technology

| Layer | Choice | Why |
|---|---|---|
| Database | MongoDB 8 + Mongoose 8 | Required by the course. Mongoose adds schemas and validation on top of MongoDB's schemaless documents. |
| Server | Node 24 + Express 5 | Required by the course. Express 5 forwards errors thrown in `async` handlers automatically. |
| Client | React 19 + Vite | Required by the course. Create React App is no longer maintained, so Vite is used to scaffold. |
| Deployment | Heroku (Eco dyno) + MongoDB Atlas | Part 2 requires a CI/CD pipeline, so the full pipeline is set up from the start. |

The project uses **ES modules** (`import`/`export`) on both the server and the
client, rather than mixing CommonJS `require` on the server with `import` on
the client. One syntax across the whole codebase is less to keep straight, and
it is the modern default for Node.

## Project layout

    yogitrack/
      server/
        server.js            entry point: Express app, middleware, routes
        config/db.js         MongoDB connection
        models/              Mongoose schemas, one file per collection
        routes/              URL -> controller function mapping
        controllers/         request handling and business rules
        services/            ID generation, confirmation messaging
        middleware/          shared validation and error handling
      client/                React application (Vite)
      docs/                  course documents, plan, and design decisions

Rationale for this layout is in [`docs/09-project-structure.md`](docs/09-project-structure.md).

## Running it locally

### 1. Prerequisites
- Node.js 24 or newer
- A running MongoDB 8 server on `localhost:27017`

### 2. Configure
```bash
cp .env.example .env
```
`.env` is git-ignored. The defaults in it work for a local MongoDB.

### 3. Install and run
```bash
npm install
npm run dev
```
The API is then on <http://localhost:5001>. Check it with:
```bash
curl localhost:5001/api/health
```

Once the React client exists, `npm run dev:all` runs the server and the client
dev server together.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/instructors` | List all instructors, newest first |
| GET | `/api/instructors/check-name?firstName=&lastName=` | Duplicate-name check (UC1 step 2) |
| GET | `/api/instructors/:instructorId` | One instructor by readable ID (e.g. `I00001`) |
| POST | `/api/instructors` | Create an instructor (UC1) |

## Documentation

- [`docs/01-project-scope-and-deliverables.md`](docs/01-project-scope-and-deliverables.md) — assignment brief and grading rubric
- [`docs/03-requirements-and-background.md`](docs/03-requirements-and-background.md) — the studio, its problem, and the requirements
- [`docs/04-use-cases.md`](docs/04-use-cases.md) — UC1–UC7 specifications
- [`docs/05-build-plan.md`](docs/05-build-plan.md) — build order and why
- [`docs/06-data-model.md`](docs/06-data-model.md) — collections and fields
- [`docs/07-design-decisions.md`](docs/07-design-decisions.md) — decisions the specification leaves open
- [`docs/08-use-case-diagram.md`](docs/08-use-case-diagram.md) — UML use-case diagram and where it differs from the written specs
