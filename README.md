# YogiTrack

A web application that replaces the paper record-keeping at the **Yoga H'om**
yoga studio: instructors, customers, class packages, the class schedule,
attendance, and studio reports.

Course project for **ACS 5423 — Software Development for World Wide Web**,
University of Oklahoma. Built on the MERN stack (MongoDB, Express, React, Node).

**Live application:** https://yogitrack-zb-9cc3ff17df1c.herokuapp.com
**Repository:** https://github.com/ZB56/yogitrack

## Status

All seven use cases are implemented.

| Use case | Description | Part | Status |
|---|---|---|---|
| UC1 | Add an instructor | 1 | **Complete** |
| UC4 | Add a customer | 1 | **Complete** |
| UC3 | Add a package | 1 | **Complete** |
| UC2 | Add a class | 2 | **Complete** |
| UC5 | Record a sale | 2 | **Complete** |
| UC6 | Record class attendance | 2 | **Complete** |
| UC7 | Studio reports | 2 | **Complete** |

Part 2 also added **authentication**: accounts with bcrypt-hashed passwords, a
signed token, and a role (manager or instructor) checked on every protected
request. See [Signing in](#signing-in) below.

Full specifications are in [`docs/04-use-cases.md`](docs/04-use-cases.md).

## Technology

| Layer | Choice | Why |
|---|---|---|
| Database | MongoDB 8 + Mongoose 8 | Required by the course. Mongoose adds schemas and validation on top of MongoDB's schemaless documents. |
| Server | Node 24 + Express 5 | Required by the course. Express 5 forwards errors thrown in `async` handlers automatically. |
| Client | React 19 + Vite | Required by the course. Create React App is no longer maintained, so Vite is used to scaffold. |
| Auth | bcryptjs + jsonwebtoken | Passwords are stored only as a bcrypt hash; a short-lived signed token carries the role on each request, with no session store for a restarting dyno to lose. |
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
        middleware/          authentication, authorisation, error handling
        scripts/             seed the price list, create the first manager
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

Create the first manager account. Every other account is created from inside
the application, so this one comes from a script; the password is read from
the environment and only its bcrypt hash is stored:
```bash
MANAGER_USERNAME=studio MANAGER_PASSWORD='choose-a-long-one' npm run create:manager
```
Run it again with the same username to reset that account's password.

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

## Signing in

There are two roles, matching the two actors in the course use cases.

| Role | Can do |
|---|---|
| **manager** | Everything: instructors, customers, packages, classes, sales, the four reports, and creating accounts (UC1-UC5, UC7) |
| **instructor** | Record attendance for the classes they lead, and see those classes and the customer list (UC6) |

There is no sign-up page, by design: a studio decides who works there. The
manager creates instructor accounts on the **Accounts** screen, which links
each login to an instructor record so UC6 can show that instructor their own
classes. The first manager comes from `npm run create:manager`.

Enforcement is on the server, in
[`server/middleware/auth.js`](server/middleware/auth.js): `requireAuth`
answers "are you signed in?" with 401 and `requireRole` answers "may you do
this?" with 403. The React route guard and the role-filtered navigation only
decide what is *offered*; they are not a security boundary, because the page's
JavaScript is already in the browser.

Tokens last eight hours, about one studio shift. They are signed with
`JWT_SECRET`, which **must** be set in production: the server refuses to start
without it rather than fall back to something guessable.

## API endpoints

Every endpoint except `/api/health` and `/api/auth/login` requires a signed-in
user, sent as `Authorization: Bearer <token>`. The **Role** column says who
may call it.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | Liveness check |
| POST | `/api/auth/login` | public | Sign in, returns the token |
| GET | `/api/auth/me` | any | Who the token belongs to |
| GET | `/api/auth/users` | manager | List accounts |
| POST | `/api/auth/users` | manager | Create an account |
| GET | `/api/instructors` | manager | List instructors, newest first |
| GET | `/api/instructors/check-name?firstName=&lastName=` | manager | Duplicate-name check (UC1 step 2) |
| GET | `/api/instructors/:instructorId` | manager | One instructor by readable ID (`I00001`) |
| POST | `/api/instructors` | manager | Create an instructor (UC1) |
| GET | `/api/customers` | manager, instructor | List customers (UC6 needs it to pick attendees) |
| GET | `/api/customers/check-name?firstName=&lastName=` | manager | Duplicate-name check (UC4 step 2) |
| GET | `/api/customers/:customerId` | manager, instructor | One customer by readable ID (`C00001`) |
| POST | `/api/customers` | manager | Create a customer (UC4) |
| GET | `/api/packages` | manager | List packages, newest first |
| GET | `/api/packages/:packageId` | manager | One package by readable ID (`P00001`) |
| POST | `/api/packages` | manager | Create a package (UC3) |
| GET | `/api/classes` | manager, instructor | The schedule; an instructor gets their own classes |
| GET | `/api/classes/check-conflict?day=&time=&durationMinutes=` | manager | Is the slot free? (UC2 steps 2-3) |
| GET | `/api/classes/:classId` | manager, instructor | One class by readable ID (`L00001`) |
| POST | `/api/classes` | manager | Schedule a class (UC2) |
| GET | `/api/sales` | manager | Every sale, or one customer's with `?customerId=` |
| GET | `/api/sales/quote?customerId=&packageId=` | manager | Price and validity for a proposed sale (UC5 step 2) |
| POST | `/api/sales` | manager | Record a sale (UC5) |
| GET | `/api/attendance` | manager, instructor | Sheets, newest first; an instructor gets their own |
| POST | `/api/attendance/preview` | manager, instructor | What the sheet would do (UC6 steps 5 and 8) |
| POST | `/api/attendance` | manager, instructor | Save the sheet (UC6 steps 7-10) |
| GET | `/api/reports/package-sales` | manager | What sold, and what it brought in |
| GET | `/api/reports/instructors` | manager | Instructors with their classes and check-ins |
| GET | `/api/reports/customers` | manager | Customers with their packages, active/future/expired |
| GET | `/api/reports/teacher-payments?month=YYYY-MM` | manager | What each instructor is owed for a month |

### Conventions worth knowing

**409 Conflict is used for a question, not a refusal.** Three endpoints answer
409 with a body that asks the caller to decide:

- `POST /api/instructors` and `POST /api/customers` answer
  `requiresConfirmation: true` when someone of the same name exists. Two
  people genuinely may share a name (UC1/UC4 step 3). Resend with
  `confirmDuplicate: true`.
- `POST /api/attendance` answers `requiresConfirmation: true` when an attendee
  has no classes left, and lists who. Resend with `allowNegativeBalance: true`
  to record the negative balance (UC6 step 8).

`POST /api/classes` also answers 409, and that one **is** a refusal: it comes
with `suggestions`, a list of free slots, because two classes cannot share one
room at one time (UC2 steps 2-4).

**401 versus 403.** 401 means "I do not know who you are", so the client sends
the user to sign in. 403 means "I know who you are, and no".

## Deployment

**The application is deployed and running at https://yogitrack-zb-9cc3ff17df1c.herokuapp.com**, backed by a MongoDB
Atlas cluster. What follows is the full setup, recorded so it can be repeated.

1. **MongoDB Atlas** — create a free cluster and a database user, allow access
   from anywhere (Heroku dynos have no fixed IP), and copy the connection
   string.
2. **GitHub** — create the repository and push:
   ```bash
   git remote add origin https://github.com/<you>/yogitrack.git
   git push -u origin main
   ```
3. **Heroku** — create the app, then set the three config vars. The Atlas
   connection string and the token secret go here and nowhere else:
   ```bash
   heroku create <app-name>
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI='<your Atlas connection string>'
   heroku config:set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
   ```
   `JWT_SECRET` is required in production: without it the server refuses to
   start, rather than signing tokens with something guessable.
4. **Connect the pipeline** — in the Heroku dashboard, Deploy → GitHub, enable
   automatic deploys from `main` and tick *Wait for CI to pass before deploy*.
   `.github/workflows/ci.yml` is the check it waits on.
5. **Create the first manager** on the deployed app, passing the password on
   the command line so it is never written to a file. Note the quotes around
   the whole command: `heroku run` takes ONE argument, and without them the
   CLI splits on the spaces and the dyno tries to run `MANAGER_USERNAME=...`
   as a program.
   ```bash
   heroku run -a <app-name> "MANAGER_USERNAME=studio MANAGER_PASSWORD='choose-a-long-one' npm run create:manager"
   ```

What is already committed: `Procfile`, `app.json`, the `heroku-postbuild`
script that compiles the React app (it passes `--include=dev`, because Heroku
sets `NODE_ENV=production`, which would otherwise skip `vite` and leave the
build with no bundler), the production branch in `server.js` that
serves `client/dist`, and the CI workflow.

**No credential is committed at any point.** The application reads
`MONGODB_URI`, `JWT_SECRET` and `PORT` from the environment; locally those come
from `.env`, which is git-ignored. Passwords are never stored at all: only
their bcrypt hash is, and the hash is excluded from every query result except
the one the sign-in code runs.

To check the production build locally before deploying:
```bash
npm run build
NODE_ENV=production JWT_SECRET=local-check npm start
```

### Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request to `main`. It
installs both halves of the project, lints and builds the React app, then
boots the server against a throwaway MongoDB and checks that:

- an anonymous request to a protected endpoint is refused with 401
- a manager can sign in, and the token opens every resource endpoint and all
  four reports
- an invalid record is rejected with 400
- a wrong password is refused with 401

The account and the signing secret it uses exist only for that run.

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
