// Usage:
//   npm run createadmin
//   npm run createadmin -- --name "Dr. Gupta" --email gupta@x.com
//   npm run createadmin -- --name "Aman" --email aman@x.com --role ob --title President
// Password is prompted (hidden), or taken from the NEW_USER_PASSWORD env var.
import "dotenv/config";
import readline from "node:readline/promises";
import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "../src/utils/passwordUtils.js";
import { UserRolesEnum, AvailableUserRoles } from "../src/utils/constants.js";
import db from "../src/db/index.js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) {
      acc.push([a.slice(2), arr[i + 1]]);
    }
    return acc;
  }, []),
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

const ask = async (q, fallback) => (fallback ?? (await rl.question(q))).trim();

const askHidden = async (q) => {
  const orig = rl._writeToOutput;
  process.stdout.write(q);
  rl._writeToOutput = () => {};
  const answer = await rl.question("");
  rl._writeToOutput = orig;
  process.stdout.write("\n");
  return answer;
};

try {
  const name = await ask("Name: ", args.name);
  const email = (await ask("Email: ", args.email)).toLowerCase();
  const role = args.role ?? UserRolesEnum.FACULTY;
  const obTitle =
    role === UserRolesEnum.OB ? await ask("OB title: ", args.title) : null;
  const password =
    process.env.NEW_USER_PASSWORD ||
    (await askHidden("Password (min 8 chars): "));

  if (!AvailableUserRoles.includes(role)) {
    throw new Error(`role must be one of: ${AvailableUserRoles.join(", ")}`);
  }
  if (role === UserRolesEnum.TEAM_LEAD) {
    throw new Error("team_lead needs a team, so create it through the API");
  }
  if (!name || !email.includes("@")) {
    throw new Error("name and a valid email are required");
  }
  if (role === UserRolesEnum.OB && !obTitle) {
    throw new Error("an OB needs a title");
  }
  if (password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }
  if (await db.getUserByEmail(email)) {
    throw new Error("A user with that email already exists.");
  }

  await db.createUser({
    id: uuidv4(),
    name,
    email,
    password: await hashPassword(password),
    role,
    obTitle,
    teams: [],
    deletedAt: null,
  });

  console.log(`Created ${role}: ${name} <${email}>`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  rl.close();
  process.exit();
}
