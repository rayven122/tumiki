import type { ComponentProps } from "react";

import { type SidebarTrigger, useSidebar } from "@/components/ui/chat/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/chat/tooltip";

import { SidebarLeftIcon } from "./icons";
import { Button } from "./ui/chat/button";

export function SidebarToggle({
  className: _className,
}: ComponentProps<typeof SidebarTrigger>) {
  // _className は将来のスタイルカスタマイズ用に予約されている
  void _className;
  const { toggleSidebar } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          data-testid="sidebar-toggle-button"
          onClick={toggleSidebar}
          variant="outline"
          className="md:h-fit md:px-2"
        >
          <SidebarLeftIcon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start">Toggle Sidebar</TooltipContent>
    </Tooltip>
  );
}
