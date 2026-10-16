/**
 * client/src/App.jsx
 * ------------------
 * The route table: which URL shows which page, and who is allowed to see it.
 *
 * React Router swaps pages in and out without the browser fetching a new
 * document, so navigation is instant and no state is lost. Java analogy: this
 * is web.xml or a @Controller's request mappings, except it runs in the
 * browser instead of on the server.
 *
 * Part 2 added two wrappers around the page routes:
 *
 *   <AuthProvider>  holds who is signed in, for every component below it.
 *   <RequireAuth>   a route with no path of its own; the routes nested inside
 *                   it are only reachable when the guard lets them through.
 *
 * Nesting the guard rather than checking inside each page means a new screen
 * is protected by where it is written, not by remembering to add a check.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import RequireAuth from './auth/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import AddInstructor from './pages/AddInstructor.jsx';
import InstructorList from './pages/InstructorList.jsx';
import AddCustomer from './pages/AddCustomer.jsx';
import CustomerList from './pages/CustomerList.jsx';
import AddPackage from './pages/AddPackage.jsx';
import PackageList from './pages/PackageList.jsx';
import AddClass from './pages/AddClass.jsx';
import ClassList from './pages/ClassList.jsx';
import RecordSale from './pages/RecordSale.jsx';
import SaleList from './pages/SaleList.jsx';
import RecordAttendance from './pages/RecordAttendance.jsx';
import AttendanceList from './pages/AttendanceList.jsx';
import Accounts from './pages/Accounts.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* The only page outside the layout and outside the guard: there is
              no navigation to show someone who is not signed in. */}
          <Route path="/login" element={<Login />} />

          {/* Everything below needs a signed-in user of any role. */}
          <Route element={<RequireAuth />}>
            {/* Routes nested inside this one render into Layout's <Outlet>,
                so every page gets the same header, navigation and footer. */}
            <Route path="/" element={<Layout />}>
              {/* `index` is the route for the parent's own path, here "/". */}
              <Route index element={<Home />} />

              {/* UC2 - the schedule. Readable by both roles: the server
                  narrows it to an instructor's own classes (UC6 step 2),
                  so the same screen serves both. */}
              <Route path="classes" element={<ClassList />} />

              {/* UC6 - Record class attendance. The instructor's use case;
                  a manager may also file a sheet, and the server limits an
                  instructor to the classes they lead. */}
              <Route path="attendance/new" element={<RecordAttendance />} />
              <Route path="attendance" element={<AttendanceList />} />

              {/* Manager-only screens. UC1, UC3 and UC4 all name the Manager
                  as their actor, and account management is the manager's by
                  definition. The server enforces the same rule; this only
                  keeps the UI honest about it. */}
              <Route element={<RequireAuth roles={['manager']} />}>
                {/* UC1 - Add an instructor.
                    The more specific "new" path is listed first for
                    readability; React Router ranks routes by specificity,
                    not by order. */}
                <Route path="instructors/new" element={<AddInstructor />} />
                <Route path="instructors" element={<InstructorList />} />

                {/* UC4 - Add a customer. */}
                <Route path="customers/new" element={<AddCustomer />} />
                <Route path="customers" element={<CustomerList />} />

                {/* UC3 - Add a package. */}
                <Route path="packages/new" element={<AddPackage />} />
                <Route path="packages" element={<PackageList />} />

                {/* UC2 - Add a class. */}
                <Route path="classes/new" element={<AddClass />} />

                {/* UC5 - Record a sale. */}
                <Route path="sales/new" element={<RecordSale />} />
                <Route path="sales" element={<SaleList />} />

                {/* Part 2: sign-in accounts (design decision 12). */}
                <Route path="accounts" element={<Accounts />} />
              </Route>

              {/* Anything unrecognised goes home rather than showing a blank
                  screen. `replace` keeps the bad URL out of the back
                  history. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
