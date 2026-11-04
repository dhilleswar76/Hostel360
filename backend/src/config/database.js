import mongoose from "mongoose";

let connectionPromise = null;
let memoryServer = null;

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectionPromise) return connectionPromise;

  const targetUri = uri || process.env.MONGODB_URI;

  connectionPromise = (async () => {
    // Attempt connecting to configured URI first
    if (targetUri && process.env.USE_MEMORY_DB !== "true") {
      try {
        const instance = await mongoose.connect(targetUri, {
          serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 10_000,
          connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10_000,
          maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
          minPoolSize: 0,
          autoIndex: true,
        });
        console.info(`MongoDB connected to external instance (${mongoose.connection.name})`);
        return instance;
      } catch (externalErr) {
        console.warn(`Could not connect to external MongoDB at ${targetUri} (${externalErr?.message || externalErr}). Falling back to embedded Mongo engine.`);
      }
    }

    // Fallback: Start MongoMemoryServer
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      if (!memoryServer) {
        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbName: "hostel360",
          },
        });
      }
      const memUri = memoryServer.getUri();
      const instance = await mongoose.connect(memUri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: true,
      });
      console.info(`MongoDB connected to embedded engine at ${memUri} (hostel360)`);
      return instance;
    } catch (memErr) {
      connectionPromise = null;
      throw new Error(`Failed to initialize database: ${memErr?.message || memErr}`);
    }
  })();

  return connectionPromise;
}

export async function disconnectDatabase() {
  connectionPromise = null;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function getDatabaseStatus() {
  switch (mongoose.connection.readyState) {
    case 1: return "connected";
    case 2: return "connecting";
    case 3: return "disconnecting";
    default: return "disconnected";
  }
}

mongoose.connection.on("error", (error) => console.error("MongoDB connection error:", error.message));
mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));

