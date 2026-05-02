import type * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

// shadcn/ui 互換 API の desktop 向け Select（CSS 変数テーマ対応）
const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

type TriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger>;

export const SelectTrigger = ({
  className = "",
  children,
  ...props
}: TriggerProps): React.JSX.Element => (
  <SelectPrimitive.Trigger
    className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors outline-none hover:bg-[var(--bg-card-hover)] focus-visible:border-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[var(--text-subtle)] ${className}`}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={16} className="opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
);

type ContentProps = React.ComponentProps<typeof SelectPrimitive.Content>;

export const SelectContent = ({
  className = "",
  children,
  position = "popper",
  ...props
}: ContentProps): React.JSX.Element => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      position={position}
      className={`data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 relative z-[60] max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xl ${className}`}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-[var(--text-muted)]">
        <ChevronUp size={14} />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="p-1">
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-[var(--text-muted)]">
        <ChevronDown size={14} />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);

type ItemProps = React.ComponentProps<typeof SelectPrimitive.Item>;

export const SelectItem = ({
  className = "",
  children,
  ...props
}: ItemProps): React.JSX.Element => (
  <SelectPrimitive.Item
    className={`relative flex cursor-pointer items-center rounded-md py-2 pr-8 pl-3 text-sm text-[var(--text-secondary)] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[var(--bg-active)] data-[highlighted]:text-[var(--text-primary)] data-[state=checked]:text-[var(--text-primary)] ${className}`}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check size={14} className="text-[var(--text-primary)]" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
);

export { Select, SelectGroup, SelectValue };
