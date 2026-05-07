import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const setupFocusTrap = (
  container: HTMLElement,
  doc: Document = document,
): (() => void) => {
  const previouslyFocused =
    doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
  const queryFocusable = () =>
    Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

  queryFocusable()[0]?.focus();

  const handleTab = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const focusable = queryFocusable();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = doc.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  doc.addEventListener("keydown", handleTab);
  return () => {
    doc.removeEventListener("keydown", handleTab);
    previouslyFocused?.focus();
  };
};

export const useFocusTrap = (
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
) => {
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;
    return setupFocusTrap(container);
  }, [containerRef, isOpen]);
};
