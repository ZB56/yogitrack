/**
 * client/src/pages/AddInstructor.jsx
 * ----------------------------------
 * UC1 — Add an instructor.
 *
 * The form itself lives in components/PersonForm.jsx, shared with UC4. This
 * page supplies only what is specific to instructors: the wording, the two
 * API functions to call, and where the "view all" link goes.
 *
 * The full UC1 flow (check the name, prompt on a duplicate, generate the ID,
 * validate, save, send the welcome message) is documented in PersonForm.
 */

import PersonForm from '../components/PersonForm.jsx';
import { checkInstructorName, createInstructor } from '../api/instructors.js';

export default function AddInstructor() {
  return (
    <PersonForm
      noun="instructor"
      title="Add an instructor"
      intro="Use case 1. YogiTrack assigns the instructor ID automatically and sends a welcome message on the contact method chosen below."
      onCheckName={checkInstructorName}
      onCreate={createInstructor}
      getRecord={(response) => response.instructor}
      getRecordId={(instructor) => instructor.instructorId}
      listPath="/instructors"
      listLabel="View all instructors"
    />
  );
}
