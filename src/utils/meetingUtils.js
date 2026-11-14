import db from "../db/index.js";
import { MeetingStatusEnum } from "./constants.js";

/**
 * Checks if a string matches YYYY-MM-DD format
 */
export const isValidDateFormat = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * Checks if a string matches HH:mm (24-hour) format
 */
export const isValidTimeFormat = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return false;
  const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
  return regex.test(timeStr);
};

/**
 * Checks if endTime is strictly after startTime
 */
export const isEndTimeAfterStartTime = (startTime, endTime) => {
  return startTime < endTime;
};

/**
 * Finds all scheduled meetings that overlap with the given time window on a specific date.
 * Overlap rule:
 * same date AND newStart < existingEnd AND newEnd > existingStart AND existing status is 'scheduled'
 */
export const findMeetingClashes = async ({
  date,
  startTime,
  endTime,
  excludeMeetingId = null,
}) => {
  const allMeetings = await db.getAllMeetings();

  return allMeetings.filter((m) => {
    if (m.status !== MeetingStatusEnum.SCHEDULED) {
      return false;
    }
    if (excludeMeetingId && m.id === excludeMeetingId) {
      return false;
    }
    if (m.date !== date) {
      return false;
    }
    // Overlap: newStart < existingEnd && newEnd > existingStart
    return startTime < m.endTime && endTime > m.startTime;
  });
};
