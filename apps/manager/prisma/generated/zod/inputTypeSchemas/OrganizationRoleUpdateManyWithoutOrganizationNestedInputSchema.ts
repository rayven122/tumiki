import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleCreateWithoutOrganizationInputSchema } from './OrganizationRoleCreateWithoutOrganizationInputSchema';
import { OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema';
import { OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema } from './OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema';
import { OrganizationRoleUpsertWithWhereUniqueWithoutOrganizationInputSchema } from './OrganizationRoleUpsertWithWhereUniqueWithoutOrganizationInputSchema';
import { OrganizationRoleCreateManyOrganizationInputEnvelopeSchema } from './OrganizationRoleCreateManyOrganizationInputEnvelopeSchema';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateWithWhereUniqueWithoutOrganizationInputSchema } from './OrganizationRoleUpdateWithWhereUniqueWithoutOrganizationInputSchema';
import { OrganizationRoleUpdateManyWithWhereWithoutOrganizationInputSchema } from './OrganizationRoleUpdateManyWithWhereWithoutOrganizationInputSchema';
import { OrganizationRoleScalarWhereInputSchema } from './OrganizationRoleScalarWhereInputSchema';

export const OrganizationRoleUpdateManyWithoutOrganizationNestedInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateManyWithoutOrganizationNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleCreateWithoutOrganizationInputSchema).array(),z.lazy(() => OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationRoleUpsertWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleUpsertWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationRoleCreateManyOrganizationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationRoleUpdateWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleUpdateWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationRoleUpdateManyWithWhereWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleUpdateManyWithWhereWithoutOrganizationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationRoleScalarWhereInputSchema),z.lazy(() => OrganizationRoleScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationRoleUpdateManyWithoutOrganizationNestedInputSchema;
