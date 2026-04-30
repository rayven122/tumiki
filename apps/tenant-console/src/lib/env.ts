import { z } from "zod";

const envSchema = z.object({
  TENANT_DATABASE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
