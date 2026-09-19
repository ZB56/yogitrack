# Project structure — RECOMMENDED

The course prescribes no folder structure and provides no starter code
(confirmed by the developer), so the layout is a design decision. Recommended:
a single repository with the Express server at the root and the React app in
`client/`. One repo means one GitHub project, one Heroku app, and one CI/CD
pipeline, which is the simplest fit for the Part 2 requirements.

    yogitrack/
      CLAUDE.md
      README.md               graded: keep it informative and current
      package.json            server dependencies and scripts
      .env.example            names of required variables, no real values
      .gitignore              node_modules, .env, client build output
      server/
        server.js             entry point: Express app, middleware, routes
        config/db.js          MongoDB connection (reads MONGODB_URI)
        models/               Mongoose schemas, one file per collection
        routes/               URL -> controller mapping, one file per resource
        controllers/          request handling and business rules
        services/
          idGenerator.js      counters-based I#####/C##### IDs
          messaging.js        confirmation messages (stub in Part 1)
        middleware/           validation, error handling
      client/                 React app
        src/
          pages/              one per screen (Instructors, Customers, ...)
          components/         shared form fields, layout, navigation
          api/                functions that call the Express endpoints
      docs/                   course documents, plan, report artifacts

How it runs:
- **Development:** Express on one port, the React dev server on another, with
  the React dev server proxying `/api` calls to Express.
- **Production (Heroku):** a build script compiles the React app, and Express
  serves the compiled files alongside the `/api` routes, so the whole app is one
  web process. Heroku supplies `PORT`; the Atlas connection string is set as a
  Heroku config var, never committed.

Java analogy: `models/` are your entity classes, `controllers/` are your service
methods, `routes/` is the mapping from a URL to the method that handles it.

React tooling: Create React App is no longer maintained; Vite is the current
standard way to scaffold a React app. If the zyBooks material for this course
teaches a specific tool, match the course instead.
