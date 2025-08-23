import { defineOrganizationFactory } from "../../../prisma/generated/fabbrica/index.js";
import { UserFactory } from "./user.js";

export const OrganizationFactory = defineOrganizationFactory({
  defaultData: ({ seq }) => ({
    id: `org_test_${seq}`,
    name: `Test Organization ${seq}`,
    creator: UserFactory,
  }),
});
