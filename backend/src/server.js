import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { validateTokenConfig } from "./auth/token.js";
import app from "./app.js";
import { runSeed } from "./scripts/seed.js";

const port = Number(process.env.PORT) || 5000;

async function start() {
  try {
    validateTokenConfig();
    await connectDatabase();

    // Auto-seed baseline data on startup if needed
    try {
      await runSeed();
    } catch (seedErr) {
      console.warn("Notice during baseline seed:", seedErr?.message || seedErr);
    }

    const server = app.listen(port, () => {
      console.log(`=========================================`);
      console.log(`  HOSTEL360 API running on port ${port}  `);
      console.log(`  Health Check: http://localhost:${port}/api/health`);
      console.log(`=========================================`);
    });

    const shutdown = (signal) => {
      console.info(`${signal} received; closing server`);
      server.close(() => void disconnectDatabase().finally(() => process.exit(0)));
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Server startup error:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void start();

