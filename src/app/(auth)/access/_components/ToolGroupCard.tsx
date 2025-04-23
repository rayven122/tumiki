"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ToolGroupCardProps = {
  group: {
    id: string;
    name: string;
    description: string;
    tools: {
      id: string;
      name: string;
    }[];
  };
  onEdit: (groupId: string) => void;
  onDelete: (groupId: string) => void;
};

export function ToolGroupCard({ group, onEdit, onDelete }: ToolGroupCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{group.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(group.id)}>
                <Edit className="mr-2 h-4 w-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(group.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>{group.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">ツール</span>
          <Badge variant="outline">{group.tools.length}</Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          {group.tools.slice(0, 8).map((tool) => (
            <Badge
              key={tool.id}
              variant="outline"
              className="border-green-200 bg-green-50 text-green-700"
            >
              {tool.name}
            </Badge>
          ))}
          {group.tools.length > 8 && (
            <Badge variant="outline" className="bg-slate-100">
              +{group.tools.length - 8}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
