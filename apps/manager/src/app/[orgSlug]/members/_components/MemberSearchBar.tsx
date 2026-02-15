"use client";

import { Input } from "@tumiki/ui/input";
import { Search } from "lucide-react";

type MemberSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export const MemberSearchBar = ({ value, onChange }: MemberSearchBarProps) => {
  return (
    <div className="relative flex-1">
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        type="text"
        placeholder="名前またはメールアドレスで検索"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};
