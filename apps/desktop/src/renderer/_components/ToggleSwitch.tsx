import type { JSX } from "react";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
}: ToggleSwitchProps): JSX.Element => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(!checked);
    }}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? "bg-emerald-500" : "bg-[var(--bg-active)]"
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-[18px]" : "translate-x-[3px]"
      }`}
    />
  </button>
);
