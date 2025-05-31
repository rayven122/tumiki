import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateWithoutMcpServerInputSchema } from './ToolCreateWithoutMcpServerInputSchema';
import { ToolUncheckedCreateWithoutMcpServerInputSchema } from './ToolUncheckedCreateWithoutMcpServerInputSchema';
import { ToolCreateOrConnectWithoutMcpServerInputSchema } from './ToolCreateOrConnectWithoutMcpServerInputSchema';
import { ToolUpsertWithWhereUniqueWithoutMcpServerInputSchema } from './ToolUpsertWithWhereUniqueWithoutMcpServerInputSchema';
import { ToolCreateManyMcpServerInputEnvelopeSchema } from './ToolCreateManyMcpServerInputEnvelopeSchema';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolUpdateWithWhereUniqueWithoutMcpServerInputSchema } from './ToolUpdateWithWhereUniqueWithoutMcpServerInputSchema';
import { ToolUpdateManyWithWhereWithoutMcpServerInputSchema } from './ToolUpdateManyWithWhereWithoutMcpServerInputSchema';
import { ToolScalarWhereInputSchema } from './ToolScalarWhereInputSchema';

export const ToolUpdateManyWithoutMcpServerNestedInputSchema: z.ZodType<Prisma.ToolUpdateManyWithoutMcpServerNestedInput> = z.object({
  create: z.union([ z.lazy(() => ToolCreateWithoutMcpServerInputSchema),z.lazy(() => ToolCreateWithoutMcpServerInputSchema).array(),z.lazy(() => ToolUncheckedCreateWithoutMcpServerInputSchema),z.lazy(() => ToolUncheckedCreateWithoutMcpServerInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ToolCreateOrConnectWithoutMcpServerInputSchema),z.lazy(() => ToolCreateOrConnectWithoutMcpServerInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ToolUpsertWithWhereUniqueWithoutMcpServerInputSchema),z.lazy(() => ToolUpsertWithWhereUniqueWithoutMcpServerInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ToolCreateManyMcpServerInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ToolUpdateWithWhereUniqueWithoutMcpServerInputSchema),z.lazy(() => ToolUpdateWithWhereUniqueWithoutMcpServerInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ToolUpdateManyWithWhereWithoutMcpServerInputSchema),z.lazy(() => ToolUpdateManyWithWhereWithoutMcpServerInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ToolScalarWhereInputSchema),z.lazy(() => ToolScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default ToolUpdateManyWithoutMcpServerNestedInputSchema;
