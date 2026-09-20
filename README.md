# YogiTrack

A web application that replaces the paper record-keeping at the **Yoga H'om**
yoga studio: instructors, customers, class packages, the class schedule,
attendance, and studio reports.

Course project for **ACS 5423 — Software Development for World Wide Web**,
University of Oklahoma. Built on the MERN stack (MongoDB, Express, React, Node).

## Status

| Use case | Description | Part | Status |
|---|---|---|---|
| UC1 | Add an instructor | 1 | **Complete** |
| UC4 | Add a customer | 1 | **Complete** |
| UC3 | Add a package | 1 | **Complete** |
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

On this development machine MongoDB is not a Homebrew service: Homebrew
refused to install it because the Xcode Command Line Tools are out of date.
The official macOS binaries were unpacked to `../.tooling/mongodb` instead
(outside the repository, so nothing about it is committed). Start it with:

```bash
../.tooling/mongodb/bin/mongod --dbpath ../.tooling/data \
  --logpath ../.tooling/log/mongod.log --port 27017 --fork
```

Any MongoDB 8 on port 27017 works just as well; nothing in the application
depends on how it was installed.

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

To load the studio's real price list (the seven packages from Fig. 2 of the
requirements) so there is something to look at:
```bash
npm run seed:packages
```
It is safe to run more than once; existing packages are skipped.
The API is then on <http://localhost:5001>. Check it with:
```bash
curl localhost:5001/api/health
```

To run the API and the React dev server together:
```bash
npm run dev:all
```
The UI is then on <http://localhost:5173>, and Vite forwards its `/api` calls
to Express.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/instructors` | List all instructors, newest first |
| GET | `/api/instructors/check-name?firstName=&lastName=` | Duplicate-name check (UC1 step 2) |
| GET | `/api/instructors/:instructorId` | One instructor by readable ID (e.g. `I00001`) |
| POST | `/api/instructors` | Create an instructor (UC1) |
| GET | `/api/customers` | List all customers, newest first |
| GET | `/api/customers/check-name?firstName=&lastName=` | Duplicate-name check (UC4 step 2) |
| GET | `/api/customers/:customerId` | One customer by readable ID (e.g. `C00001`) |
| POST | `/api/customers` | Create a customer (UC4) |
| GET | `/api/packages` | List all packages, newest first |
| GET | `/api/packages/:packageId` | One package by readable ID (e.g. `P00001`) |
| POST | `/api/packages` | Create a package (UC3) |

Both `POST` endpoints answer **409 Conflict** with
`requiresConfirmation: true` when a person of the same name already exists.
That is not a rejection — two people may genuinely share a name (UC1/UC4
step 3). Resend the same body with `confirmDuplicate: true` to save it.

## Deploying to Heroku

The repository is ready to deploy; the hosted accounts are created by hand.

1. **MongoDB Atlas** — create a free cluster and a database user, allow access
   from anywhere (Heroku dynos have no fixed IP), and copy the connection
   string.
2. **GitHub** — create the repository and push:
   ```bash
   git remote add origin https://github.com/<you>/yogitrack.git
   git push -u origin main
   ```
3. **Heroku** — create the app, then set the two config vars. The Atlas
   connection string goes here and nowhere else:
   ```bash
   heroku create <app-name>
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI='<your Atlas connection string>'
   ```
4. **Connect the pipeline** — in the Heroku dashboard, Deploy → GitHub, enable
   automatic deploys from `main` and tick *Wait for CI to pass before deploy*.
   `.github/workflows/ci.yml` is the check it waits on.

What is already committed: `Procfile`, `app.json`, the `heroku-postbuild`
script that compiles the React app (it passes `--include=dev`, because Heroku
sets `NODE_ENV=production`, which would otherwise skip `vite` and leave the
build with no bundler), the production branch in `server.js` that
serves `client/dist`, and the CI workflow.

**No credential is committed at any point.** The application reads
`MONGODB_URI` and `PORT` from the environment; locally those come from `.env`,
which is git-ignored.

To check the production build locally before deploying:
```bash
npm run build
NODE_ENV=production npm start
```

## Documentation

- [`docs/01-project-scope-and-deliverables.md`](docs/01-project-scope-and-deliverables.md) — assignment brief and grading rubric
- [`docs/03-requirements-and-background.md`](docs/03-requirements-and-background.md) — the studio, its problem, and the requirements
- [`docs/04-use-cases.md`](docs/04-use-cases.md) — UC1–UC7 specifications
- [`docs/05-build-plan.md`](docs/05-build-plan.md) — build order and why
- [`docs/06-data-model.md`](docs/06-data-model.md) — collections and fields
- [`docs/07-design-decisions.md`](docs/07-design-decisions.md) — decisions the specification leaves open
- [`docs/08-use-case-diagram.md`](docs/08-use-case-diagram.md) — the course use-case diagram and where it differs from the written specs
- [`docs/10-uml-models.md`](docs/10-uml-models.md) — the four UML models, with editable PlantUML source
- [`docs/11-project-report.md`](docs/11-project-report.md) — **the Part 1 project report**
