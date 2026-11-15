import { ApiError } from "./apiError.js";
import { ErrorCodeEnum } from "./constants.js";
import { userLeadsTeam } from "./userUtils.js";
import {
  PERMISSIONS,
  TEAM_SCOPE,
  DEFAULT_TEAM_SCOPE,
} from "../config/permissions.js";

const DEFAULT_DENY = "You don't have permission to perform this action";

export const getPermission = (action) => {
  const permission = PERMISSIONS[action];
  if (!permission) {
    throw new Error(
      `Unknown permission "${action}". Add it to src/config/permissions.js`,
    );
  }
  return permission;
};

export const assertCan = (user, action) => {
  if (!user) {
    throw new ApiError(
      401,
      ErrorCodeEnum.UNAUTHENTICATED,
      "Authentication required",
    );
  }
  if (!getPermission(action).roles.includes(user.role)) {
    throw new ApiError(403, ErrorCodeEnum.FORBIDDEN, DEFAULT_DENY);
  }
};

export const assertOwnerOrRole = (user, action, ownerId) => {
  const permission = getPermission(action);
  if (ownerId && ownerId === user.id) {
    return;
  }
  if ((permission.ownerOr ?? []).includes(user.role)) {
    return;
  }
  throw new ApiError(
    403,
    ErrorCodeEnum.FORBIDDEN,
    permission.denyMessage ?? DEFAULT_DENY,
  );
};

export const assertTeamScope = (user, resource, teamId) => {
  const scope = TEAM_SCOPE[resource];
  if (!scope) {
    throw new Error(
      `Unknown TEAM_SCOPE "${resource}". Add it to src/config/permissions.js`,
    );
  }
  const rule = scope.rules[user.role] ?? DEFAULT_TEAM_SCOPE;

  if (!teamId) {
    if (!rule.allowNoTeam) {
      throw new ApiError(403, ErrorCodeEnum.FORBIDDEN, scope.messages.noTeam);
    }
    return;
  }

  if (!rule.anyTeam && !userLeadsTeam(user, teamId)) {
    throw new ApiError(403, ErrorCodeEnum.FORBIDDEN, scope.messages.notLed);
  }
};
