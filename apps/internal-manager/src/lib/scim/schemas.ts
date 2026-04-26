import { z } from "zod";

const scimMemberSchema = z.object({
  value: z.string(),
  display: z.string().optional(),
});

export const scimUserSchema = z.object({
  schemas: z.array(z.string()).optional(),
  externalId: z.string().optional(),
  userName: z.string(),
  displayName: z.string().optional(),
  name: z
    .object({
      formatted: z.string().optional(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
  emails: z
    .array(
      z.object({
        value: z.string(),
        primary: z.boolean().optional(),
        type: z.string().optional(),
      }),
    )
    .optional(),
  active: z.boolean().optional().default(true),
});

export const scimGroupSchema = z.object({
  schemas: z.array(z.string()).optional(),
  externalId: z.string().optional(),
  displayName: z.string(),
  members: z.array(scimMemberSchema).optional().default([]),
});

export const scimPatchOpSchema = z.object({
  schemas: z.array(z.string()).optional(),
  Operations: z.array(
    z.object({
      op: z.string().transform((v) => v.toLowerCase()),
      path: z.string().optional(),
      value: z
        .union([
          z.boolean(),
          z.string(),
          z.array(scimMemberSchema),
          z.record(z.string(), z.unknown()),
        ])
        .optional(),
    }),
  ),
});

export type ScimUserInput = z.infer<typeof scimUserSchema>;
export type ScimGroupInput = z.infer<typeof scimGroupSchema>;
export type ScimPatchInput = z.infer<typeof scimPatchOpSchema>;
