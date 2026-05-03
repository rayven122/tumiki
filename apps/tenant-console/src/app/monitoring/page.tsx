import { redirect } from "next/navigation";

const MonitoringPage = async () => {
  redirect("/tenants");
};

export default MonitoringPage;
