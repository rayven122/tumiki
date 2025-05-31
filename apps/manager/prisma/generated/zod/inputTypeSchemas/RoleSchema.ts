import { z } from 'zod';

export const RoleSchema = z.enum(['SYSTEM_ADMIN','USER']);

export type RoleType = `${z.infer<typeof RoleSchema>}`

export default RoleSchema;
