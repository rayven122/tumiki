import { OrganizationNavigationClient } from "./OrganizationNavigationClient";

export const OrganizationNavigation = () => {
  // OrganizationNavigationClientはContextを直接使用するため、
  // サーバーコンポーネントから組織データを渡す必要がなくなりました
  return <OrganizationNavigationClient />;
};
