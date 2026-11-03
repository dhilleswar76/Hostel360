import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";

async function main() {
  await connectDatabase();
  const result = await mongoose.connection.db?.admin().command({ ping: 1 });
  if (result?.ok !== 1) throw new Error("MongoDB ping did not return ok: 1");
  console.info(`MongoDB connectivity verified (database: ${mongoose.connection.name}).`);
}

main()
  .catch((error) => {
    console.error("MongoDB connectivity test failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase().catch(() => null));

