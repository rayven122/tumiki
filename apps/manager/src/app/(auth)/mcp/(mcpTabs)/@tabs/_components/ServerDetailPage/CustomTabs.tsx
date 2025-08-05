"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

type CustomTabsProps = {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => React.ReactNode;
};

export const CustomTabs = ({ tabs, defaultTab, children }: CustomTabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? "");

  return (
    <div className="w-full">
      {/* Tab List */}
      <div className="mb-6">
        <div className="bg-muted text-muted-foreground inline-flex h-10 items-center justify-center rounded-md p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-background/50",
              )}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">{children(activeTab)}</div>
    </div>
  );
};
