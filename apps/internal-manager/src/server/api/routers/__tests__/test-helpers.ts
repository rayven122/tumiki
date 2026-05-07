import { TRPCError } from "@trpc/server";
import { expect } from "vitest";

export const expectTrpcErrorCode = async (
  promise: Promise<unknown>,
  code: TRPCError["code"],
) => {
  let error: unknown;
  try {
    await promise;
  } catch (caught) {
    error = caught;
  }

  if (error === undefined) {
    throw new Error("TRPCErrorが発生しませんでした");
  }
  expect(error instanceof TRPCError).toStrictEqual(true);
  if (!(error instanceof TRPCError)) {
    throw new Error("TRPCErrorではないエラーが発生しました");
  }
  expect(error.code).toStrictEqual(code);
};
