import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { UserRolesEnum, TeamTypeEnum } from "../utils/constants.js";
import { formatTeamResponse } from "../utils/teamUtils.js";
import db from "../db/index.js";

/**
 * GET /api/v1/dashboard
 * Aggregated dashboard data per schema specs:
 * - counts: members, officeBearers, executives, teamLeads
 * - officeBearers: [{ id, name, obTitle }]
 * - executives: [{ id, name }]
 * - coreTeams: [{ id, name, type, leads, memberCount }]
 * - subClubs: [{ id, name, type, leads, memberCount }]
 */
export const getDashboardData = asyncHandler(async (req, res) => {
  const allUsers = await db.getAllUsers();
  const allTeams = await db.getAllTeams();

  // Categorize users by role
  let membersCount = 0;
  let officeBearersCount = 0;
  let executivesCount = 0;
  let teamLeadsCount = 0;
  let facultyCount = 0;

  const officeBearers = [];
  const executives = [];

  for (const user of allUsers) {
    switch (user.role) {
      case UserRolesEnum.OB:
        officeBearersCount++;
        officeBearers.push({
          id: user.id,
          name: user.name,
          obTitle: user.obTitle ?? null,
        });
        break;
      case UserRolesEnum.EXECUTIVE:
        executivesCount++;
        executives.push({
          id: user.id,
          name: user.name,
        });
        break;
      case UserRolesEnum.TEAM_LEAD:
        teamLeadsCount++;
        break;
      case UserRolesEnum.MEMBER:
        membersCount++;
        break;
      case UserRolesEnum.FACULTY:
        facultyCount++;
        break;
      default:
        break;
    }
  }

  // Format teams — pass allUsers so formatTeamResponse doesn't re-fetch per team
  const coreTeamObjects = allTeams.filter((t) => t.type === TeamTypeEnum.CORE);
  const subClubObjects = allTeams.filter(
    (t) => t.type === TeamTypeEnum.SUBCLUB,
  );

  const [coreTeams, subClubs] = await Promise.all([
    Promise.all(
      coreTeamObjects.map(async (t) => {
        const formatted = await formatTeamResponse(t, false, allUsers);
        return {
          id: formatted.id,
          name: formatted.name,
          type: formatted.type,
          leads: formatted.leads,
          memberCount: formatted.memberCount,
        };
      }),
    ),
    Promise.all(
      subClubObjects.map(async (t) => {
        const formatted = await formatTeamResponse(t, false, allUsers);
        return {
          id: formatted.id,
          name: formatted.name,
          type: formatted.type,
          leads: formatted.leads,
          memberCount: formatted.memberCount,
        };
      }),
    ),
  ]);

  const dashboardData = {
    counts: {
      members: membersCount,
      officeBearers: officeBearersCount,
      executives: executivesCount,
      teamLeads: teamLeadsCount,
      faculty: facultyCount,
    },
    officeBearers,
    executives,
    coreTeams,
    subClubs,
  };

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dashboardData,
        "Dashboard data fetched successfully",
      ),
    );
});
