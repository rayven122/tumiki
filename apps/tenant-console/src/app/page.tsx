import { redirect } from "next/navigation";

// ルートは /tenants にリダイレクト
const HomePage = () => {
  redirect("/tenants");
};

export default HomePage;
