"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const isJapanese = pathname === "/jp";

  const handleLanguageChange = (value: string) => {
    if (value === "ja") {
      router.push("/jp");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-gray-700" />
      <Select
        value={isJapanese ? "ja" : "en"}
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger className="w-[100px] rounded-full border-2 border-gray-300 bg-white text-xs font-medium text-gray-700 transition-all duration-300 hover:border-black hover:text-black hover:shadow-[2px_2px_0_rgba(0,0,0,0.1)] focus:border-black md:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="ja">日本語</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
