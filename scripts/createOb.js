// Usage:
//   npm run createob
//   npm run createob -- --name "n" --email a@x.com --title President
// Password is always prompted (hidden), or taken from OB_PASSWORD env var.
import "dotenv/config";
import readline from "node:readline/promises";
import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "../src/utils/passwordUtils.js";
import { UserRolesEnum } from "../src/utils/constants.js";
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
  const obTitle = await ask("OB title (e.g. President): ", args.title);
  const password =
    process.env.OB_PASSWORD || (await askHidden("Password (min 8 chars): "));

  if (!name || !email.includes("@") || !obTitle) {
    throw new Error("name, valid email and title are required");
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
    role: UserRolesEnum.OB,
    obTitle,
    teams: [],
    deletedAt: null,
  });

  console.log(`Created OB: ${name} <${email}> (${obTitle})`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  rl.close();
  process.exit();
}
