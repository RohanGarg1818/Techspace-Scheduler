export const DB_NAME = "techspace";

export const UserRolesEnum = {
  OB: "ob",
  FACULTY: "faculty",
  EXECUTIVE: "executive",
  TEAM_LEAD: "team_lead",
  MEMBER: "member",
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

export const TeamPositionEnum = {
  LEAD: "lead",
  COLEAD: "colead",
  MEMBER: "member",
};

export const AvailableTeamPositions = Object.values(TeamPositionEnum);

export const TeamTypeEnum = {
  CORE: "core",
  SUBCLUB: "subclub",
};

export const AvailableTeamTypes = Object.values(TeamTypeEnum);

export const MeetingTypeEnum = {
  OB: "ob",
  CORE: "core",
  SUBCLUB: "subclub",
};

export const AvailableMeetingTypes = Object.values(MeetingTypeEnum);

export const MeetingColorEnum = {
  OB: "#1E3A8A",
  CORE: "#0D9488",
  SUBCLUB: "#7C3AED",
};

export const MeetingStatusEnum = {
  SCHEDULED: "scheduled",
  CANCELLED: "cancelled",
};

export const AvailableMeetingStatuses = Object.values(MeetingStatusEnum);

export const AnnouncementTypeEnum = {
  SOCIETY: "society",
  TEAM: "team",
};

export const AvailableAnnouncementTypes = Object.values(AnnouncementTypeEnum);

export const AnnouncementPriorityEnum = {
  NORMAL: "normal",
  URGENT: "urgent",
};

export const AvailableAnnouncementPriorities = Object.values(
  AnnouncementPriorityEnum,
);

export const ErrorCodeEnum = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  MEETING_CLASH: "MEETING_CLASH",
  CONFLICT: "CONFLICT",
};
