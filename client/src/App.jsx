/**
 * client/src/App.jsx
 * ------------------
 * The route table: which URL shows which page.
 *
 * React Router swaps pages in and out without the browser fetching a new
 * document, so navigation is instant and no state is lost. Java analogy: this
 * is web.xml or a @Controller's request mappings, except it runs in the
 * browser instead of on the server.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import AddInstructor from './pages/AddInstructor.jsx';
import InstructorList from './pages/InstructorList.jsx';
import AddCustomer from './pages/AddCustomer.jsx';
import CustomerList from './pages/CustomerList.jsx';
import AddPackage from './pages/AddPackage.jsx';
import PackageList from './pages/PackageList.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes nested inside this one render into Layout's <Outlet>, so
            every page gets the same header, navigation and footer. */}
        <Route path="/" element={<Layout />}>
          {/* `index` is the route for the parent's own path, here "/". */}
          <Route index element={<Home />} />

          {/* UC1 — Add an instructor.
              The more specific "new" path is listed first for readability;
              React Router ranks routes by specificity, not by order. */}
          <Route path="instructors/new" element={<AddInstructor />} />
          <Route path="instructors" element={<InstructorList />} />

          {/* UC4 - Add a customer. */}
          <Route path="customers/new" element={<AddCustomer />} />
          <Route path="customers" element={<CustomerList />} />

          {/* UC3 - Add a package. */}
          <Route path="packages/new" element={<AddPackage />} />
          <Route path="packages" element={<PackageList />} />

          {/* Anything unrecognised goes home rather than showing a blank
              screen. `replace` keeps the bad URL out of the back history. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
