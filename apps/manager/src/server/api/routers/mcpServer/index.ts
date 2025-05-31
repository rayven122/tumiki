import { createTRPCRouter, protectedProcedure } from "apps/manager/src/server/api/trpc";
import { findAllWithTools } from "./findAllWithTools";

export const mcpServerRouter = createTRPCRouter({
  findAll: protectedProcedure.query(findAllWithTools),
});
