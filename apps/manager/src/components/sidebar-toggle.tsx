import type { ComponentProps } from "react";

import {
  type SidebarTrigger,
  useSidebar,
} from "@/features/chat/components/Sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tumiki/ui/tooltip";
import { Button } from "@tumiki/ui/button";

import { SidebarLeftIcon } from "./icons";

export function SidebarToggle({
  className,
}: ComponentProps<typeof SidebarTrigger>) {
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
