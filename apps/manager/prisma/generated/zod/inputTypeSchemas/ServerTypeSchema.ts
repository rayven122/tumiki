import { z } from 'zod';

export const ServerTypeSchema = z.enum(['CUSTOM','OFFICIAL']);

export type ServerTypeType = `${z.infer<typeof ServerTypeSchema>}`

export default ServerTypeSchema;
