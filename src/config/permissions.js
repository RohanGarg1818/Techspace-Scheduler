import { UserRolesEnum } from "../utils/constants.js";

const { OB, FACULTY, TEAM_LEAD } = UserRolesEnum;
const ALL = Object.values(UserRolesEnum); // every logged-in role

/**
 * PERMISSIONS
 *
 *   roles:      roles allowed to call the endpoint at all (enforced in routes)
 *   ownerOr:    (optional) the creator of the item may ALWAYS do this, and so
 *               may these roles even if they are not the creator
 *   denyMessage:(optional) error text when the ownerOr check fails
 *
 * Reading the edit rows below:
 *   roles: [OB, FACULTY, TEAM_LEAD], ownerOr: [FACULTY]
 *   = OB and team leads can edit only what THEY created, faculty can edit anything.
 *
 * Examples:
 *   let executives create meetings: "meetings.create": { roles: [OB, FACULTY, TEAM_LEAD, EXECUTIVE] }
 *   lock the dashboard to faculty:  "dashboard.view":  { roles: [FACULTY] }
 */
export const PERMISSIONS = {
  // users: faculty only
  "users.list": { roles: ALL },
  "users.view": { roles: ALL },
  "users.create": { roles: [FACULTY] },
  "users.update": { roles: [FACULTY] },
  "users.delete": { roles: [FACULTY] },

  // teams
  "teams.list": { roles: ALL },
  "teams.view": { roles: ALL },
  "teams.create": { roles: [FACULTY] },
  "teams.update": { roles: [FACULTY] },
  "teams.delete": { roles: [FACULTY] },
  "teams.manageMembers": { roles: [FACULTY] },

  // meetings
  "meetings.list": { roles: ALL },
  "meetings.view": { roles: ALL },
  "meetings.checkClash": { roles: ALL },
  "meetings.create": { roles: [OB, FACULTY, TEAM_LEAD] },
  "meetings.update": {
    roles: [OB, FACULTY, TEAM_LEAD],
    ownerOr: [FACULTY],
    denyMessage: "Only the creator or faculty can edit this meeting",
  },
  "meetings.cancel": {
    roles: [OB, FACULTY, TEAM_LEAD],
    ownerOr: [FACULTY],
    denyMessage: "Only the creator or faculty can cancel this meeting",
  },
  "meetings.delete": { roles: [OB, FACULTY] },

  // tentative meetings 
  "tentativeMeetings.list": { roles: ALL },
  "tentativeMeetings.view": { roles: ALL },
  "tentativeMeetings.create": { roles: [OB, FACULTY, TEAM_LEAD] },
  "tentativeMeetings.update": {
    roles: [OB, FACULTY, TEAM_LEAD],
    ownerOr: [FACULTY],
    denyMessage: "Only the creator or faculty can edit this tentative meeting",
  },
  "tentativeMeetings.cancel": {
    roles: [OB, FACULTY, TEAM_LEAD],
    ownerOr: [FACULTY],
    denyMessage:
      "Only the creator or faculty can cancel this tentative meeting",
  },
  "tentativeMeetings.delete": { roles: [OB, FACULTY] },

  // announcements
  "announcements.list": { roles: ALL },
  "announcements.view": { roles: ALL },
  "announcements.create": { roles: [OB, FACULTY, TEAM_LEAD] },
  "announcements.update": {
    roles: [OB, FACULTY, TEAM_LEAD],
    ownerOr: [FACULTY],
    denyMessage: "Only the creator or faculty can edit this announcement",
  },
  "announcements.delete": {
    roles: [OB, FACULTY, TEAM_LEAD],
    ownerOr: [FACULTY],
    denyMessage: "Only the creator or faculty can delete this announcement",
  },

  // dashboard
  "dashboard.view": { roles: ALL },
};

/**
 * TEAM_SCOPE: which team a role may attach when creating/changing an item.
 *
 *   anyTeam:     true  = any team
 *                false = only teams the user leads or co-leads
 *   allowNoTeam: true  = may leave the team empty
 *                        (meetings/tentative: an "OB meeting", announcements: society-wide)
 *                false = a team is required
 *
 * Roles not listed here get DEFAULT_TEAM_SCOPE (the strictest setting).
 */
export const DEFAULT_TEAM_SCOPE = { anyTeam: false, allowNoTeam: false };

const standardRules = () => ({
  [OB]: { anyTeam: true, allowNoTeam: true },
  [FACULTY]: { anyTeam: true, allowNoTeam: true },
  [TEAM_LEAD]: { anyTeam: false, allowNoTeam: false },
});

export const TEAM_SCOPE = {
  meetings: {
    rules: standardRules(),
    messages: {
      noTeam:
        "Only OBs and faculty can create or change a meeting to an OB meeting",
      notLed: "You can only assign meetings to teams you lead or co-lead",
    },
  },
  tentativeMeetings: {
    rules: standardRules(),
    messages: {
      noTeam:
        "Only OBs and faculty can create or change a tentative meeting to an OB meeting",
      notLed:
        "You can only assign tentative meetings to teams you lead or co-lead",
    },
  },
  announcements: {
    rules: standardRules(),
    messages: {
      noTeam: "Only OBs and faculty can create society-wide announcements",
      notLed: "You can only create announcements for teams you lead or co-lead",
    },
  },
};

export const RULES = {
  users: {
    allowSelfRoleChange: false, // can a user change their own role?
    allowSelfDelete: false, // can a user delete themselves?
    protectedRoles: [FACULTY],
  },
  meetings: { allowEditCancelled: false },
  tentativeMeetings: { allowEditCancelled: false },
};
