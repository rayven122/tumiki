import { describe, expect, test } from "vitest";

import { externalId, sourceId } from "../domain/branded.js";
import { computeIdempotencyKey } from "./idempotency.js";

describe("computeIdempotencyKey", () => {
  const source = sourceId("scim:okta");
  const ext = externalId("user-123");

  test("同じ入力に対して同じ key を返す", () => {
    const a = computeIdempotencyKey(source, ext, { email: "a@example.com" });
    const b = computeIdempotencyKey(source, ext, { email: "a@example.com" });
    expect(a).toStrictEqual(b);
  });

  test("payload の object key 順序が異なっても同じ key を返す", () => {
    const a = computeIdempotencyKey(source, ext, {
      email: "a@example.com",
      name: "A",
    });
    const b = computeIdempotencyKey(source, ext, {
      name: "A",
      email: "a@example.com",
    });
    expect(a).toStrictEqual(b);
  });

  test("payload が異なれば key も異なる", () => {
    const a = computeIdempotencyKey(source, ext, { email: "a@example.com" });
    const b = computeIdempotencyKey(source, ext, { email: "b@example.com" });
    expect(a).not.toStrictEqual(b);
  });

  test("source が異なれば key も異なる", () => {
    const a = computeIdempotencyKey(source, ext, { email: "a@example.com" });
    const b = computeIdempotencyKey(sourceId("jit:okta"), ext, {
      email: "a@example.com",
    });
    expect(a).not.toStrictEqual(b);
  });
});
