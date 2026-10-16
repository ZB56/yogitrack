/**
 * server/controllers/classController.js
 * -------------------------------------
 * The business rules for UC2, "Add a class".
 *
 * The interesting part of this use case is step 2: "YogiTrack checks if there
 * is a conflict in the schedule as only one class can be held at any time",
 * and step 3: "If there is a conflict then YogiTrack suggests other options in
 * the calendar." Rejecting a clash is easy; proposing somewhere to put the
 * class instead is what makes the rule usable.
 *
 * Assumption (design decision 5): the specification never states how long a
 * class lasts, so a class carries its own durationMinutes, defaulting to 60.
 * Without a length "only one class at a time" cannot be tested at all.
 */

import Class, {
  DAYS,
  DEFAULT_DURATION_MINUTES,
  timeToMinutes,
  minutesToTime,
} from '../models/Class.js';
import Instructor from '../models/Instructor.js';
import { generateId } from '../services/idGenerator.js';
import { sendMessage, sendStudioMessage, classScheduledMessage } from '../services/messaging.js';

/**
 * The window alternative slots are proposed within, and how far apart the
 * proposals are spaced.
 *
 * Another assumption: the requirements say the studio runs classes "every day
 * including weekends" but never give opening hours, so suggestions are kept
 * to a plausible 6am-9pm studio day. This limits only what YogiTrack
 * PROPOSES. A manager may still enter any time they like, which is why the
 * schema accepts any valid 24-hour time.
 */
const EARLIEST_START = timeToMinutes('06:00');
const LATEST_START = timeToMinutes('21:00');
const SUGGESTION_STEP_MINUTES = 30;
const MAX_SUGGESTIONS = 4;

/**
 * Find every class that clashes with a proposed slot.
 *
 * Only classes on the same day can clash, so the database is asked for that
 * day alone and the overlap test runs over a handful of documents rather than
 * the whole collection.
 *
 * @param {{day: string, time: string, durationMinutes: number}} slot
 * @param {string} [excludeClassId] - a class to ignore, when re-checking one
 * @returns {Promise<Array>} the clashing class documents
 */
async function findClashes(slot, excludeClassId = null) {
  const sameDay = await Class.find({ day: slot.day, active: true });

  return sameDay.filter(
    (existing) =>
      existing.classId !== excludeClassId && existing.clashesWith(slot)
  );
}

/**
 * Propose free slots near the one the manager asked for (UC2 step 3).
 *
 * The order is deliberate, nearest first in the sense a manager thinks about:
 *   1. later the same day, in half-hour steps
 *   2. earlier the same day, working back from the requested time
 *   3. the same time on the following days
 *
 * A manager with a conflict usually wants to nudge the class an hour, not
 * move it to Sunday, so the same-day options come first.
 *
 * @param {{day: string, time: string, durationMinutes: number}} slot
 * @param {Array} sameDayClasses - every active class on that day
 * @returns {Array<{day: string, time: string}>}
 */
function buildSuggestions(slot, sameDayClasses) {
  const duration = slot.durationMinutes || DEFAULT_DURATION_MINUTES;
  const requested = timeToMinutes(slot.time);
  const suggestions = [];

  /** Is this candidate free, given the classes already on that day? */
  function isFree(day, startMinutes, dayClasses) {
    const candidate = { day, time: minutesToTime(startMinutes), durationMinutes: duration };
    return !dayClasses.some((existing) => existing.clashesWith(candidate));
  }

  // 1. Later the same day.
  for (
    let start = requested + SUGGESTION_STEP_MINUTES;
    start <= LATEST_START && suggestions.length < MAX_SUGGESTIONS;
    start += SUGGESTION_STEP_MINUTES
  ) {
    if (isFree(slot.day, start, sameDayClasses)) {
      suggestions.push({ day: slot.day, time: minutesToTime(start) });
    }
  }

  // 2. Earlier the same day, nearest first.
  for (
    let start = requested - SUGGESTION_STEP_MINUTES;
    start >= EARLIEST_START && suggestions.length < MAX_SUGGESTIONS;
    start -= SUGGESTION_STEP_MINUTES
  ) {
    if (isFree(slot.day, start, sameDayClasses)) {
      suggestions.push({ day: slot.day, time: minutesToTime(start) });
    }
  }

  return suggestions;
}

/**
 * Same time, following days. Separated from buildSuggestions because it needs
 * the database (the other days' classes are not loaded yet) and because
 * keeping the pure, testable part pure is worth the extra function.
 *
 * @param {{day: string, time: string, durationMinutes: number}} slot
 * @param {number} wanted - how many more suggestions are needed
 * @returns {Promise<Array<{day: string, time: string}>>}
 */
async function suggestOtherDays(slot, wanted) {
  if (wanted <= 0) return [];

  const found = [];
  const startIndex = DAYS.indexOf(slot.day);

  // Walk the week round from the day after the requested one, so Friday
  // suggests Saturday before it suggests Monday.
  for (let offset = 1; offset < DAYS.length && found.length < wanted; offset += 1) {
    const day = DAYS[(startIndex + offset) % DAYS.length];
    const candidate = { ...slot, day };

    const clashes = await findClashes(candidate);
    if (clashes.length === 0) {
      found.push({ day, time: slot.time });
    }
  }

  return found;
}

/**
 * Check a proposed slot without saving anything (UC2 steps 2 and 3).
 *
 * The React form calls this before submitting, the same two-step shape as the
 * duplicate-name check in UC1: ask the server first, show the manager what it
 * found, and only then save. The create endpoint repeats the check, because
 * the server is the only place a rule is real.
 *
 * GET /api/classes/check-conflict?day=Tuesday&time=09:00&durationMinutes=60
 */
export async function checkClassConflict(req, res) {
  const { day = '', time = '', durationMinutes } = req.query;

  if (!DAYS.includes(day) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    return res.status(400).json({
      error: 'Invalid slot',
      message: 'A day of the week and a 24-hour time such as 09:00 are needed.',
    });
  }

  const slot = {
    day,
    time,
    durationMinutes: Number(durationMinutes) || DEFAULT_DURATION_MINUTES,
  };

  const sameDay = await Class.find({ day, active: true });
  const clashes = sameDay.filter((existing) => existing.clashesWith(slot));

  if (clashes.length === 0) {
    return res.json({ conflict: false, clashesWith: [], suggestions: [] });
  }

  const suggestions = buildSuggestions(slot, sameDay);
  const fromOtherDays = await suggestOtherDays(
    slot,
    MAX_SUGGESTIONS - suggestions.length
  );

  res.json({
    conflict: true,
    clashesWith: clashes.map((existing) => ({
      classId: existing.classId,
      day: existing.day,
      time: existing.time,
      endTime: existing.endTime,
      instructorId: existing.instructorId,
      classType: existing.classType,
    })),
    suggestions: [...suggestions, ...fromOtherDays],
  });
}

/**
 * Create a class. UC2 steps 1-6.
 *
 * POST /api/classes
 * Body: instructorId, day, time, durationMinutes, classType, payRate
 */
export async function createClass(req, res) {
  const { instructorId, day, time, durationMinutes, classType, payRate } = req.body;

  // MongoDB does not enforce references, so the instructor is checked here.
  // Saving a class against an instructor who does not exist would produce a
  // schedule entry nobody can teach and a payment report that cannot balance.
  const instructor = instructorId
    ? await Instructor.findOne({ instructorId: String(instructorId).toUpperCase() })
    : null;

  if (!instructor) {
    return res.status(400).json({
      error: 'Unknown instructor',
      message: 'Please choose an instructor from the list.',
      fields: { instructorId: 'No instructor with that id.' },
    });
  }

  const newClass = new Class({
    instructorId: instructor.instructorId,
    day,
    time,
    durationMinutes: durationMinutes || DEFAULT_DURATION_MINUTES,
    classType,
    payRate,
  });

  // Validate before anything else. The conflict check below reads `time` and
  // `durationMinutes`, and running it on unvalidated input would mean testing
  // a slot that is not a slot. Same ordering rule as decision 15: no ID is
  // taken until the record is known to be good.
  await newClass.validate({ pathsToSkip: ['classId'] });

  // UC2 step 2: only one class can be held at any time.
  const slot = {
    day: newClass.day,
    time: newClass.time,
    durationMinutes: newClass.durationMinutes,
  };

  const sameDay = await Class.find({ day: newClass.day, active: true });
  const clashes = sameDay.filter((existing) => existing.clashesWith(slot));

  if (clashes.length > 0) {
    const suggestions = buildSuggestions(slot, sameDay);
    const fromOtherDays = await suggestOtherDays(
      slot,
      MAX_SUGGESTIONS - suggestions.length
    );

    /**
     * 409 Conflict, and literally so. Note what this does NOT offer: a way to
     * save anyway. The duplicate-name check in UC1 can be overridden because
     * two people really may share a name, but two classes cannot occupy one
     * room at one time, so the only way forward is a different slot. UC2
     * step 4 has the manager choose one of the suggestions.
     */
    return res.status(409).json({
      error: 'Schedule conflict',
      message:
        `${clashes[0].classId} already runs on ${clashes[0].day} from ` +
        `${clashes[0].time} to ${clashes[0].endTime}. Only one class can be ` +
        'held at a time.',
      conflict: true,
      clashesWith: clashes.map((existing) => ({
        classId: existing.classId,
        day: existing.day,
        time: existing.time,
        endTime: existing.endTime,
      })),
      suggestions: [...suggestions, ...fromOtherDays],
    });
  }

  // UC2 step 5: the manager confirms and the schedule is published.
  newClass.classId = await generateId('class');
  await newClass.save();

  /**
   * UC2 step 6: confirm to the instructor and to the manager.
   *
   * The instructor gets it on their preferred channel, as UC1 established.
   * The manager is whoever is signed in, and a login account has no contact
   * details, so their copy goes to the studio address. Both are stubs that
   * log rather than deliver; see services/messaging.js.
   */
  const text = classScheduledMessage(newClass, instructor.fullName);

  const instructorNotification = await sendMessage(instructor, text);
  const managerNotification = await sendStudioMessage(text, req.user?.username);

  res.status(201).json({
    message: `Class ${newClass.classId} scheduled for ${newClass.slotLabel}.`,
    class: newClass,
    instructor: {
      instructorId: instructor.instructorId,
      fullName: instructor.fullName,
    },
    notifications: [instructorNotification, managerNotification],
  });
}

/**
 * List the schedule.
 *
 * An instructor sees only the classes they lead, which is what UC6 step 2
 * asks for ("the list of classes that are assigned to / led by the
 * instructor"). The filter is applied here, from the signed-in user's own
 * token, rather than taken from a query parameter the caller controls.
 *
 * GET /api/classes
 */
export async function listClasses(req, res) {
  const filter = { active: true };

  if (req.user.role === 'instructor') {
    filter.instructorId = req.user.instructorId;
  }

  const classes = await Class.find(filter);

  /**
   * Sort by day of the week and then by time, so the result reads like the
   * studio's printed timetable. It is done here rather than in MongoDB
   * because the sort key is the POSITION of the day in DAYS; sorting on the
   * stored text would put Friday before Monday.
   */
  classes.sort((a, b) => {
    const byDay = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (byDay !== 0) return byDay;
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });

  // Attach each instructor's name, so the schedule does not read as a column
  // of ID codes. One query for all of them rather than one per class.
  const instructorIds = [...new Set(classes.map((item) => item.instructorId))];
  const instructors = await Instructor.find({ instructorId: { $in: instructorIds } });
  const nameById = new Map(
    instructors.map((instructor) => [instructor.instructorId, instructor.fullName])
  );

  res.json({
    count: classes.length,
    classes: classes.map((item) => ({
      ...item.toJSON(),
      instructorName: nameById.get(item.instructorId) || 'Unknown instructor',
    })),
  });
}

/**
 * Fetch one class by its readable ID.
 * GET /api/classes/L00001
 */
export async function getClass(req, res) {
  const found = await Class.findOne({
    classId: req.params.classId.toUpperCase(),
  });

  if (!found) {
    return res.status(404).json({
      error: 'Not found',
      message: `No class with id ${req.params.classId}.`,
    });
  }

  // An instructor may read their own classes, not somebody else's.
  if (req.user.role === 'instructor' && found.instructorId !== req.user.instructorId) {
    return res.status(403).json({
      error: 'Not allowed',
      message: 'You can only view the classes you lead.',
    });
  }

  res.json({ class: found });
}
