import type { createCalendarApi } from "../../api/index.js";
import type { CalendarError } from "../../lib/errors/index.js";
import type { Result } from "../../lib/result.js";
import type { GetColorsInput } from "../types.js";
import { err, ok } from "../../lib/result.js";

export const getColors = async (
  client: ReturnType<typeof createCalendarApi>,
  _input: GetColorsInput,
): Promise<Result<unknown, CalendarError>> => {
  const result = await client.getColors();

  if (!result.success) {
    return err(result.error);
  }

  return ok(result.data);
};
