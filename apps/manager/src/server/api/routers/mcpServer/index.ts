import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { findAllWithTools } from "./findAllWithTools";

export const mcpServerRouter = createTRPCRouter({
  findAll: protectedProcedure.query(findAllWithTools),
});
