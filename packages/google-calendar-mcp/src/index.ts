#!/usr/bin/env node
import dotenv from "dotenv";

import { getAuthConfig } from "./lib/auth-config.js";
import { runServer } from "./mcp/index.js";

// Load environment variables
dotenv.config();

const main = async () => {
  try {
    const config = getAuthConfig();
    await runServer(config);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

main().catch(console.error);
