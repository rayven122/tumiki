// "use client";

// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default function Dashboard() {
  redirect("/mcp/servers");
  // const user = {
  //   name: "John Doe",
  //   email: "john.doe@example.com",
  //   avatar: "https://github.com/shadcn.png",
  //   provider: "email",
  // };

  // const handleSignOut = async () => {
  //   await signIn();
  // };

  // return (
  //   <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
  //     <Card className="w-full max-w-md">
  //       <CardHeader className="flex flex-row items-center gap-4">
  //         <Avatar className="h-14 w-14">
  //           <AvatarImage src={user.avatar} alt={user.name} />
  //           <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
  //         </Avatar>
  //         <div>
  //           <CardTitle className="text-xl">
  //             {user.name}さん、ようこそ！
  //           </CardTitle>
  //           <CardDescription>{user.email}</CardDescription>
  //         </div>
  //       </CardHeader>
  //       <CardContent>
  //         <div className="space-y-2">
  //           <p className="text-muted-foreground text-sm">
  //             ログイン方法:{" "}
  //             {user.provider === "email" ? "メールアドレス" : user.provider}
  //           </p>
  //           <p className="text-sm">
  //             ログインに成功しました。これはモックデータを使用したデモです。
  //           </p>
  //         </div>
  //       </CardContent>
  //       <CardFooter>
  //         <Button
  //           variant="outline"
  //           className="w-full"
  //           onClick={() => {
  //             void handleSignOut();
  //           }}
  //         >
  //           ログアウト
  //         </Button>
  //       </CardFooter>
  //     </Card>
  //   </div>
  // );
}
