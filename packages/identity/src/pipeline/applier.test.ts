import { describe, expect, test } from "vitest";

import type { ApplierDeps } from "./applier.js";
import { createInMemoryEventBus } from "../__tests__/fixtures/in-memory-event-bus.js";
import { createInMemoryIdentityStore } from "../__tests__/fixtures/in-memory-store.js";
import {
  buildTenantConfig,
  SOURCE_JIT_OKTA,
  SOURCE_SCIM_OKTA,
  TEST_TENANT_ID,
} from "../__tests__/fixtures/tenant-config.js";
import { externalId, userId } from "../domain/branded.js";
import { canonicalizeEmail } from "../domain/email.js";
import {
  applyEvent,
  applyUserDeactivated,
  applyUserUpserted,
} from "./applier.js";
import { buildEventMeta, createPipelineContext } from "./context.js";

const buildDeps = (
  configOverrides?: Parameters<typeof buildTenantConfig>[0],
): ApplierDeps & {
  readonly store: ReturnType<typeof createInMemoryIdentityStore>;
  readonly eventBus: ReturnType<typeof createInMemoryEventBus>;
} => ({
  store: createInMemoryIdentityStore(),
  eventBus: createInMemoryEventBus(),
  tenantConfig: buildTenantConfig(configOverrides),
});

describe("applyUserUpserted", () => {
  test("新規 user を作成し IdentityLinked event を発行する", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = await applyUserUpserted(deps, ctx, {
      type: "UserUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("ext-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("ext-1"),
        email: canonicalizeEmail("a@example.com"),
        emailVerified: true,
        displayName: "Alice",
        attributes: {},
      },
    });

    expect(result).toStrictEqual({ kind: "applied" });
    expect(deps.store.state.users).toHaveLength(1);
    expect(deps.store.state.identities).toHaveLength(1);
    const linkedEvents = deps.eventBus.published.filter(
      (e) => e.type === "IdentityLinked",
    );
    expect(linkedEvents).toHaveLength(1);
    const linkedEvent = linkedEvents[0];
    if (linkedEvent?.type === "IdentityLinked") {
      expect(linkedEvent.payload.strategy).toStrictEqual("new_user");
    }
  });

  test("既存 Identity があれば display name のみ更新する", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);

    await applyUserUpserted(deps, ctx, {
      type: "UserUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("ext-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("ext-1"),
        email: canonicalizeEmail("a@example.com"),
        emailVerified: true,
        displayName: "Alice",
        attributes: {},
      },
    });

    await applyUserUpserted(deps, ctx, {
      type: "UserUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("ext-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("ext-1"),
        email: canonicalizeEmail("a@example.com"),
        emailVerified: true,
        displayName: "Alice Updated",
        attributes: {},
      },
    });

    expect(deps.store.state.users).toHaveLength(1);
    expect(deps.store.state.users[0]?.displayName).toStrictEqual(
      "Alice Updated",
    );
    expect(deps.store.state.identities).toHaveLength(1);
  });

  test("email 一致 + verified なら既存 User に Identity を attach する", async () => {
    const deps = buildDeps();
    const scimCtx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    await applyUserUpserted(deps, scimCtx, {
      type: "UserUpserted",
      meta: buildEventMeta(scimCtx, {
        externalId: externalId("scim-ext-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("scim-ext-1"),
        email: canonicalizeEmail("alice@example.com"),
        emailVerified: true,
        displayName: "Alice",
        attributes: {},
      },
    });

    const jitCtx = createPipelineContext(TEST_TENANT_ID, SOURCE_JIT_OKTA);
    await applyUserUpserted(deps, jitCtx, {
      type: "UserUpserted",
      meta: buildEventMeta(jitCtx, {
        externalId: externalId("jit-ext-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("jit-ext-1"),
        email: canonicalizeEmail("alice@example.com"),
        emailVerified: true,
        displayName: "Alice",
        attributes: {},
      },
    });

    expect(deps.store.state.users).toHaveLength(1);
    expect(deps.store.state.identities).toHaveLength(2);
    const linked = deps.eventBus.published
      .filter((e) => e.type === "IdentityLinked")
      .map((e) => (e.type === "IdentityLinked" ? e.payload.strategy : null));
    expect(linked).toStrictEqual(["new_user", "email"]);
  });

  test("jitAllowed=false かつ新規 User 必要なら skip する", async () => {
    const deps = buildDeps({ jitAllowed: false });
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_JIT_OKTA);
    const result = await applyUserUpserted(deps, ctx, {
      type: "UserUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("ext-jit"),
        payload: {},
      }),
      payload: {
        externalId: externalId("ext-jit"),
        email: canonicalizeEmail("new@example.com"),
        emailVerified: true,
        displayName: "New",
        attributes: {},
      },
    });

    expect(result.kind).toStrictEqual("skipped");
    expect(deps.store.state.users).toHaveLength(0);
  });
});

describe("applyUserDeactivated", () => {
  test("authoritative source からの deactivate は反映される", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    await applyUserUpserted(deps, ctx, {
      type: "UserUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("ext-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("ext-1"),
        email: canonicalizeEmail("a@example.com"),
        emailVerified: true,
        displayName: "A",
        attributes: {},
      },
    });

    const result = await applyUserDeactivated(deps, ctx, {
      type: "UserDeactivated",
      meta: buildEventMeta(ctx, {
        externalId: externalId("ext-1"),
        payload: {},
      }),
      payload: { externalId: externalId("ext-1"), reason: "test" },
    });

    expect(result).toStrictEqual({ kind: "applied" });
    expect(deps.store.state.users[0]?.status).toStrictEqual("SUSPENDED");
  });

  test("非 authoritative source からの deactivate は無視される", async () => {
    const deps = buildDeps();
    const scimCtx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    await applyUserUpserted(deps, scimCtx, {
      type: "UserUpserted",
      meta: buildEventMeta(scimCtx, {
        externalId: externalId("ext-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("ext-1"),
        email: canonicalizeEmail("a@example.com"),
        emailVerified: true,
        displayName: "A",
        attributes: {},
      },
    });

    const jitCtx = createPipelineContext(TEST_TENANT_ID, SOURCE_JIT_OKTA);
    const result = await applyUserDeactivated(deps, jitCtx, {
      type: "UserDeactivated",
      meta: buildEventMeta(jitCtx, {
        externalId: externalId("ext-1"),
        payload: {},
      }),
      payload: { externalId: externalId("ext-1"), reason: "from jit" },
    });

    expect(result.kind).toStrictEqual("skipped");
    expect(deps.store.state.users[0]?.status).toStrictEqual("ACTIVE");
  });
});

describe("applyEvent dispatch", () => {
  test("派生 event (IdentityLinked) は no-op として skip する", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = await applyEvent(deps, ctx, {
      type: "IdentityLinked",
      meta: buildEventMeta(ctx, {
        externalId: externalId("ext-1"),
        payload: {},
      }),
      payload: {
        userId: deps.store.state.users[0]?.id ?? userId("placeholder"),
        externalId: externalId("ext-1"),
        strategy: "new_user",
      },
    });
    expect(result.kind).toStrictEqual("skipped");
  });
});
