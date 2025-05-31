import { z } from 'zod';

export const ServerStatusSchema = z.enum(['RUNNING','STOPPED','ERROR']);

export type ServerStatusType = `${z.infer<typeof ServerStatusSchema>}`

export default ServerStatusSchema;
