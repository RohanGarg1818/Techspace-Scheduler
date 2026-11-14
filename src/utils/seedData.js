import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "./passwordUtils.js";
import db from "../db/index.js";
import { UserRolesEnum, TeamTypeEnum, TeamPositionEnum } from "./constants.js";

export const seedDatabase = async () => {
  console.log("Seeding database...");

  const techTeam = {
    id: uuidv4(),
    name: "Tech Team",
    type: TeamTypeEnum.CORE,
    description: "Builds and maintains society tech",
    memberCount: 0,
  };

  const designClub = {
    id: uuidv4(),
    name: "Design Club",
    type: TeamTypeEnum.SUBCLUB,
    description: "UI/UX and graphics",
    memberCount: 0,
  };

  await db.createTeam(techTeam);
  await db.createTeam(designClub);

  const users = [
    {
      id: uuidv4(),
      name: "Aman Verma",
      email: "aman@techspace.com",
      password: await hashPassword("password123"),
      role: UserRolesEnum.OB,
      obTitle: "President",
      teams: [],
      deletedAt: null,
    },
    {
      id: uuidv4(),
      name: "Priyanshu Yadav",
      email: "priyanshu@techspace.com",
      password: await hashPassword("password123"),
      role: UserRolesEnum.TEAM_LEAD,
      obTitle: null,
      teams: [
        {
          teamId: techTeam.id,
          position: TeamPositionEnum.LEAD,
        },
      ],
      deletedAt: null,
    },
    {
      id: uuidv4(),
      name: "Riya Sharma",
      email: "riya@techspace.com",
      password: await hashPassword("password123"),
      role: UserRolesEnum.MEMBER,
      obTitle: null,
      teams: [
        {
          teamId: techTeam.id,
          position: TeamPositionEnum.MEMBER,
        },
      ],
      deletedAt: null,
    },
    {
      id: uuidv4(),
      name: "Kabir Mehta",
      email: "kabir@techspace.com",
      password: await hashPassword("password123"),
      role: UserRolesEnum.TEAM_LEAD,
      obTitle: null,
      teams: [
        {
          teamId: designClub.id,
          position: TeamPositionEnum.LEAD,
        },
      ],
      deletedAt: null,
    },
    {
      id: uuidv4(),
      name: "Neha Singh",
      email: "neha@techspace.com",
      password: await hashPassword("password123"),
      role: UserRolesEnum.EXECUTIVE,
      obTitle: null,
      teams: [],
      deletedAt: null,
    },
    {
      id: uuidv4(),
      name: "Dr. Gupta",
      email: "gupta@techspace.com",
      password: await hashPassword("password123"),
      role: UserRolesEnum.FACULTY,
      obTitle: null,
      teams: [],
      deletedAt: null,
    },
  ];

  for (const user of users) {
    await db.createUser(user);
  }

  techTeam.memberCount = users.filter((u) =>
    u.teams.some((t) => t.teamId === techTeam.id),
  ).length;

  designClub.memberCount = users.filter((u) =>
    u.teams.some((t) => t.teamId === designClub.id),
  ).length;

  await db.updateTeam(techTeam.id, { memberCount: techTeam.memberCount });
  await db.updateTeam(designClub.id, { memberCount: designClub.memberCount });

  console.log("Database seeded successfully!");
  console.log("\nTest credentials:");
  console.log("OB: aman@techspace.com / password123");
  console.log("Team Lead: priyanshu@techspace.com / password123");
  console.log("Member: riya@techspace.com / password123");
  console.log("Faculty: gupta@techspace.com / password123");
  console.log("Executive: neha@techspace.com / password123");
};
