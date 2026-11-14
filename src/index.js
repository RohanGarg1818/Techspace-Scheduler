import dotenv from "dotenv";
import app from "./app.js";
import { seedDatabase } from "./utils/seedData.js";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 8000;

if (process.env.NODE_ENV !== "production") {
  seedDatabase().catch(console.error);
}

app.listen(PORT, () => {
  console.log(`Server is listening on port: http://localhost:${PORT}`);
});
