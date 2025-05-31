import { z } from 'zod';

export const PermissionActionSchema = z.enum(['CREATE','READ','UPDATE','DELETE','MANAGE']);

export type PermissionActionType = `${z.infer<typeof PermissionActionSchema>}`

export default PermissionActionSchema;
