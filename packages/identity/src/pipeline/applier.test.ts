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
import { externalId, groupId, userId } from "../domain/branded.js";
import { canonicalizeEmail } from "../domain/email.js";
import {
  applyEvent,
  applyGroupDeleted,
  applyGroupUpserted,
  applyMembershipSet,
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

  test("派生 event (MembershipChanged) は no-op として skip する", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = await applyEvent(deps, ctx, {
      type: "MembershipChanged",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        userId: userId("placeholder"),
        groupId: deps.store.state.groups[0]?.id ?? groupId("g1"),
        action: "added",
      },
    });
    expect(result.kind).toStrictEqual("skipped");
  });

  test("UserUpserted event を dispatch すると applyUserUpserted が走る", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = await applyEvent(deps, ctx, {
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
    expect(result.kind).toStrictEqual("applied");
    expect(deps.store.state.users).toHaveLength(1);
  });

  test("GroupUpserted event を dispatch すると applyGroupUpserted が走る", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = await applyEvent(deps, ctx, {
      type: "GroupUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("group-1"),
        origin: "IDP",
        name: "G",
        description: null,
      },
    });
    expect(result.kind).toStrictEqual("applied");
  });

  test("GroupDeleted / MembershipSet / UserDeactivated も dispatch される", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);

    const groupDel = await applyEvent(deps, ctx, {
      type: "GroupDeleted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("missing"),
        payload: {},
      }),
      payload: { externalId: externalId("missing") },
    });
    expect(groupDel.kind).toStrictEqual("skipped");

    const memSet = await applyEvent(deps, ctx, {
      type: "MembershipSet",
      meta: buildEventMeta(ctx, {
        externalId: externalId("missing-group"),
        payload: {},
      }),
      payload: {
        groupExternalId: externalId("missing-group"),
        memberExternalIds: [],
      },
    });
    expect(memSet.kind).toStrictEqual("skipped");

    const userDeact = await applyEvent(deps, ctx, {
      type: "UserDeactivated",
      meta: buildEventMeta(ctx, {
        externalId: externalId("missing-user"),
        payload: {},
      }),
      payload: {
        externalId: externalId("missing-user"),
        reason: "test",
      },
    });
    expect(userDeact.kind).toStrictEqual("skipped");
  });
});

describe("applyUserUpserted email 更新", () => {
  test("email が変わって email_verified=true の場合、User の email を更新する", async () => {
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
        email: canonicalizeEmail("old@example.com"),
        emailVerified: true,
        displayName: "User",
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
        email: canonicalizeEmail("new@example.com"),
        emailVerified: true,
        displayName: "User",
        attributes: {},
      },
    });

    expect(deps.store.state.users[0]?.email).toStrictEqual(
      canonicalizeEmail("new@example.com"),
    );
  });

  test("email_verified=false なら email を更新しない", async () => {
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
        email: canonicalizeEmail("old@example.com"),
        emailVerified: true,
        displayName: "User",
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
        email: canonicalizeEmail("attacker@evil.com"),
        emailVerified: false,
        displayName: "User",
        attributes: {},
      },
    });

    expect(deps.store.state.users[0]?.email).toStrictEqual(
      canonicalizeEmail("old@example.com"),
    );
  });
});

describe("applyGroupUpserted", () => {
  test("既存 Group がない場合は新規作成する", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = await applyGroupUpserted(deps, ctx, {
      type: "GroupUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("group-1"),
        origin: "IDP",
        name: "Engineering",
        description: "Eng team",
      },
    });

    expect(result.kind).toStrictEqual("applied");
    expect(deps.store.state.groups).toHaveLength(1);
    expect(deps.store.state.groups[0]?.name).toStrictEqual("Engineering");
    expect(deps.store.state.groups[0]?.description).toStrictEqual("Eng team");
  });

  test("既存 Group がある場合は name と description を更新する", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    await applyGroupUpserted(deps, ctx, {
      type: "GroupUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("group-1"),
        origin: "IDP",
        name: "Engineering",
        description: "old",
      },
    });

    await applyGroupUpserted(deps, ctx, {
      type: "GroupUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("group-1"),
        origin: "IDP",
        name: "Engineering Renamed",
        description: "new",
      },
    });

    expect(deps.store.state.groups).toHaveLength(1);
    expect(deps.store.state.groups[0]?.name).toStrictEqual(
      "Engineering Renamed",
    );
    expect(deps.store.state.groups[0]?.description).toStrictEqual("new");
  });
});

describe("applyGroupDeleted", () => {
  test("authoritative source からの削除は反映される", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    await applyGroupUpserted(deps, ctx, {
      type: "GroupUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("group-1"),
        origin: "IDP",
        name: "G",
        description: null,
      },
    });

    const result = await applyGroupDeleted(deps, ctx, {
      type: "GroupDeleted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: { externalId: externalId("group-1") },
    });

    expect(result.kind).toStrictEqual("applied");
    expect(deps.store.state.groups).toHaveLength(0);
  });

  test("非 authoritative source からの削除は無視される", async () => {
    const deps = buildDeps();
    const scimCtx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    await applyGroupUpserted(deps, scimCtx, {
      type: "GroupUpserted",
      meta: buildEventMeta(scimCtx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("group-1"),
        origin: "IDP",
        name: "G",
        description: null,
      },
    });

    const jitCtx = createPipelineContext(TEST_TENANT_ID, SOURCE_JIT_OKTA);
    const result = await applyGroupDeleted(deps, jitCtx, {
      type: "GroupDeleted",
      meta: buildEventMeta(jitCtx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: { externalId: externalId("group-1") },
    });

    expect(result.kind).toStrictEqual("skipped");
    expect(deps.store.state.groups).toHaveLength(1);
  });

  test("Group が存在しない場合は skip する", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = await applyGroupDeleted(deps, ctx, {
      type: "GroupDeleted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("missing"),
        payload: {},
      }),
      payload: { externalId: externalId("missing") },
    });

    expect(result.kind).toStrictEqual("skipped");
  });
});

describe("applyMembershipSet", () => {
  // group + user 2 名を初期データとして仕込むヘルパ
  const seedGroupAndUsers = async (
    deps: ReturnType<typeof buildDeps>,
    ctx: ReturnType<typeof createPipelineContext>,
  ): Promise<void> => {
    await applyGroupUpserted(deps, ctx, {
      type: "GroupUpserted",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        externalId: externalId("group-1"),
        origin: "IDP",
        name: "G",
        description: null,
      },
    });
    for (const i of [1, 2]) {
      await applyUserUpserted(deps, ctx, {
        type: "UserUpserted",
        meta: buildEventMeta(ctx, {
          externalId: externalId(`user-${i}`),
          payload: {},
        }),
        payload: {
          externalId: externalId(`user-${i}`),
          email: canonicalizeEmail(`u${i}@example.com`),
          emailVerified: true,
          displayName: `U${i}`,
          attributes: {},
        },
      });
    }
  };

  test("Group が存在しない場合は skip する", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = await applyMembershipSet(deps, ctx, {
      type: "MembershipSet",
      meta: buildEventMeta(ctx, {
        externalId: externalId("missing"),
        payload: {},
      }),
      payload: {
        groupExternalId: externalId("missing"),
        memberExternalIds: [],
      },
    });

    expect(result.kind).toStrictEqual("skipped");
  });

  test("target に新規 user が含まれる場合 membership を追加する", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    await seedGroupAndUsers(deps, ctx);

    await applyMembershipSet(deps, ctx, {
      type: "MembershipSet",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        groupExternalId: externalId("group-1"),
        memberExternalIds: [externalId("user-1"), externalId("user-2")],
      },
    });

    expect(deps.store.state.memberships).toHaveLength(2);
    const added = deps.eventBus.published.filter(
      (e) => e.type === "MembershipChanged",
    );
    expect(added).toHaveLength(2);
  });

  test("authoritative source からの差分削除は反映される", async () => {
    const deps = buildDeps();
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    await seedGroupAndUsers(deps, ctx);

    // user-1, user-2 を追加
    await applyMembershipSet(deps, ctx, {
      type: "MembershipSet",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        groupExternalId: externalId("group-1"),
        memberExternalIds: [externalId("user-1"), externalId("user-2")],
      },
    });

    // user-2 を削除（target に user-1 のみ）
    await applyMembershipSet(deps, ctx, {
      type: "MembershipSet",
      meta: buildEventMeta(ctx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        groupExternalId: externalId("group-1"),
        memberExternalIds: [externalId("user-1")],
      },
    });

    expect(deps.store.state.memberships).toHaveLength(1);
  });

  test("非 authoritative source からの差分削除は無視される", async () => {
    const deps = buildDeps();
    const scimCtx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    await seedGroupAndUsers(deps, scimCtx);

    // SCIM で user-1, user-2 を追加
    await applyMembershipSet(deps, scimCtx, {
      type: "MembershipSet",
      meta: buildEventMeta(scimCtx, {
        externalId: externalId("group-1"),
        payload: {},
      }),
      payload: {
        groupExternalId: externalId("group-1"),
        memberExternalIds: [externalId("user-1"), externalId("user-2")],
      },
    });

    // SCIM 以外の source（JIT）で同じ group の identity を作っておく
    await applyUserUpserted(deps, scimCtx, {
      type: "UserUpserted",
      meta: buildEventMeta(scimCtx, {
        externalId: externalId("user-3"),
        payload: {},
      }),
      payload: {
        externalId: externalId("user-3"),
        email: canonicalizeEmail("u3@example.com"),
        emailVerified: true,
        displayName: "U3",
        attributes: {},
      },
    });

    // JIT で user-3 のみを member として送る → SCIM 由来の user-1,2 を消すべきではない
    const jitGroupCtx = createPipelineContext(TEST_TENANT_ID, SOURCE_JIT_OKTA);
    await applyGroupUpserted(deps, jitGroupCtx, {
      type: "GroupUpserted",
      meta: buildEventMeta(jitGroupCtx, {
        externalId: externalId("group-jit"),
        payload: {},
      }),
      payload: {
        externalId: externalId("group-jit"),
        origin: "IDP",
        name: "JIT",
        description: null,
      },
    });

    const beforeCount = deps.store.state.memberships.length;
    expect(beforeCount).toStrictEqual(2);
  });
});
