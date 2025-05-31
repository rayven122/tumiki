import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateWithoutMcpServerConfigsInputSchema } from './ToolCreateWithoutMcpServerConfigsInputSchema';
import { ToolUncheckedCreateWithoutMcpServerConfigsInputSchema } from './ToolUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { ToolCreateOrConnectWithoutMcpServerConfigsInputSchema } from './ToolCreateOrConnectWithoutMcpServerConfigsInputSchema';
import { ToolUpsertWithWhereUniqueWithoutMcpServerConfigsInputSchema } from './ToolUpsertWithWhereUniqueWithoutMcpServerConfigsInputSchema';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolUpdateWithWhereUniqueWithoutMcpServerConfigsInputSchema } from './ToolUpdateWithWhereUniqueWithoutMcpServerConfigsInputSchema';
import { ToolUpdateManyWithWhereWithoutMcpServerConfigsInputSchema } from './ToolUpdateManyWithWhereWithoutMcpServerConfigsInputSchema';
import { ToolScalarWhereInputSchema } from './ToolScalarWhereInputSchema';

export const ToolUncheckedUpdateManyWithoutMcpServerConfigsNestedInputSchema: z.ZodType<Prisma.ToolUncheckedUpdateManyWithoutMcpServerConfigsNestedInput> = z.object({
  create: z.union([ z.lazy(() => ToolCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolCreateWithoutMcpServerConfigsInputSchema).array(),z.lazy(() => ToolUncheckedCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolUncheckedCreateWithoutMcpServerConfigsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ToolCreateOrConnectWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolCreateOrConnectWithoutMcpServerConfigsInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ToolUpsertWithWhereUniqueWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolUpsertWithWhereUniqueWithoutMcpServerConfigsInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ToolUpdateWithWhereUniqueWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolUpdateWithWhereUniqueWithoutMcpServerConfigsInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ToolUpdateManyWithWhereWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolUpdateManyWithWhereWithoutMcpServerConfigsInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ToolScalarWhereInputSchema),z.lazy(() => ToolScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default ToolUncheckedUpdateManyWithoutMcpServerConfigsNestedInputSchema;
