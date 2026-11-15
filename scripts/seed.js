// Usage: npm run seed
import "dotenv/config";
import { seedDatabase } from "../src/utils/seedData.js";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed in production.");
  process.exit(1);
}
await seedDatabase();
process.exit();
