import db from "../db/index.js";

/**
 * Checks if a date range overlaps with any existing tentative meetings
 * or regular meetings (for warning purposes only, not blocking)
 *
 * @param {object} params
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @param {string|null} params.startTime - Optional start time (HH:mm)
 * @param {string|null} params.endTime - Optional end time (HH:mm)
 * @param {string|null} params.excludeTentativeMeetingId - ID to exclude from check
 * @returns {Promise<object>} Object with regularClashes and tentativeClashes arrays
 */
export const findTentativeMeetingOverlaps = async ({
  startDate,
  endDate,
  startTime = null,
  endTime = null,
  excludeTentativeMeetingId = null,
}) => {
  const allMeetings = await db.getAllMeetings();
  const regularClashes = allMeetings.filter((m) => {
    if (m.status !== "scheduled") {
      return false;
    }

    if (m.date < startDate || m.date > endDate) {
      return false;
    }

    if (startTime && endTime) {
      return m.startTime < endTime && m.endTime > startTime;
    }

    return true;
  });

  const allTentativeMeetings = await db.getAllTentativeMeetings();
  const tentativeClashes = allTentativeMeetings.filter((tm) => {
    if (tm.status !== "scheduled") {
      return false;
    }
    if (excludeTentativeMeetingId && tm.id === excludeTentativeMeetingId) {
      return false;
    }

    if (startDate > tm.endDate || endDate < tm.startDate) {
      return false;
    }

    if (startTime && endTime && tm.startTime && tm.endTime) {
      return startTime < tm.endTime && endTime > tm.startTime;
    }

    return true;
  });

  return {
    regularClashes,
    tentativeClashes,
  };
};

/**
 * Validates that endDate is on or after startDate
 */
export const isEndDateAfterStartDate = (startDate, endDate) => {
  return startDate <= endDate;
};

/**
 * Validates that if time is provided, both startTime and endTime must be present
 */
export const isTimeRangeValid = (startTime, endTime) => {
  if (!startTime && !endTime) {
    return true;
  }
  if (startTime && endTime) {
    return true;
  }
  return false;
};

/**
 * Validates that endTime is after startTime
 */
export const isEndTimeAfterStartTime = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return true;
  }
  return startTime < endTime;
};
