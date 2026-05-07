// Identity Linking 戦略
// 新しい (source, externalId) が来たとき、どの User に紐づけるかを決める pure 関数群
// 順序:
//   1. (source, externalId) 完全一致 → 既存 User を返す
//   2. tenant + canonical(email) + email_verified=true → 既存 User へ attach
//   3. それ以外 → 新規 User 作成

import type { CanonicalEmail } from "../domain/email.js";
import type { Identity } from "../domain/identity.js";
import type { User } from "../domain/user.js";

export type LinkingDecision =
  | { readonly kind: "existing_identity"; readonly user: User }
  | {
      readonly kind: "attach_to_existing_user";
      readonly user: User;
    }
  | { readonly kind: "create_new_user" };

export type LinkingInputs = {
  readonly existingIdentity: Identity | null;
  readonly userOfExistingIdentity: User | null;
  readonly userByEmail: User | null;
  readonly emailVerified: boolean;
};

export const decideLinking = (inputs: LinkingInputs): LinkingDecision => {
  // 1. 既に Identity がある → そのまま使う
  if (
    inputs.existingIdentity !== null &&
    inputs.userOfExistingIdentity !== null
  ) {
    return {
      kind: "existing_identity",
      user: inputs.userOfExistingIdentity,
    };
  }

  // 2. email 一致 + verified → 既存 User に attach
  // verified でない email は信用しない（他人にすり替わるリスクがある）
  if (inputs.userByEmail !== null && inputs.emailVerified) {
    return {
      kind: "attach_to_existing_user",
      user: inputs.userByEmail,
    };
  }

  // 3. 該当なし → 新規 User
  return { kind: "create_new_user" };
};

export type LinkingQuery = {
  readonly email: CanonicalEmail;
  readonly emailVerified: boolean;
};
