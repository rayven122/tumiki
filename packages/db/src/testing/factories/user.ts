import { Role } from "@prisma/client";

import { defineUserFactory } from "../../../prisma/generated/fabbrica/index.js";

export const UserFactory = defineUserFactory({
  defaultData: ({ seq }) => ({
    id: `auth0|test-user-${seq}`,
    email: `test-user-${seq}@example.com`,
    name: `Test User ${seq}`,
    image: null,
    role: Role.USER,
    hasCompletedOnboarding: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
});

export const AdminUserFactory = defineUserFactory({
  defaultData: ({ seq }) => ({
    id: `auth0|admin-user-${seq}`,
    email: `admin-user-${seq}@example.com`,
    name: `Admin User ${seq}`,
    image: null,
    role: Role.SYSTEM_ADMIN,
    hasCompletedOnboarding: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
});

export const OnboardedUserFactory = defineUserFactory({
  defaultData: ({ seq }) => ({
    id: `auth0|onboarded-user-${seq}`,
    email: `onboarded-user-${seq}@example.com`,
    name: `Onboarded User ${seq}`,
    image: "https://example.com/avatar.jpg",
    role: Role.USER,
    hasCompletedOnboarding: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
});
