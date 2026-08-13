"use client";

import { useState, type ReactNode } from "react";

import PlusMinusIcon from "./PlusMinusIcon";

type Theme = "light" | "dark";
type Tint = "default" | "accent" | "warning";

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  theme?: Theme;
  tint?: Tint;
  badge?: ReactNode;
  // Interactive controls (buttons, etc.) rendered in the header
  // itself, between the title/description and the badge/toggle --
  // for example Approve/Needs Revision on the Contextual Checklist
  // section. Rendered outside the toggle button so clicks on these
  // never also open/close the section.
  headerActions?: ReactNode;
  defaultOpen?: boolean;
  // When both are provided, open state is controlled by the parent
  // (e.g. ControlCard uses this so only one section per control is
  // open at a time). Omit both to keep the section's own internal
  // open/closed state, as ApplicationCard's sections do.
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
};

const CONTAINER_CLASSES: Record<
  Theme,
  Record<Tint, string>
> = {
  light: {
    default: "border-slate-200 bg-white",
    accent: "border-indigo-200 bg-indigo-50",
    warning: "border-amber-200 bg-amber-50",
  },
  dark: {
    default:
      "border-slate-700 bg-slate-950/40",
    accent:
      "border-indigo-900 bg-indigo-950/30",
    warning:
      "border-amber-900 bg-amber-950/20",
  },
};

const TITLE_CLASSES: Record<Theme, string> = {
  light: "text-slate-900",
  dark: "text-white",
};

const DESCRIPTION_CLASSES: Record<
  Theme,
  string
> = {
  light: "text-slate-500",
  dark: "text-slate-400",
};

const TOGGLE_CLASSES: Record<Theme, string> = {
  light:
    "border-slate-300 text-slate-500",
  dark: "border-slate-600 text-slate-300",
};

const DIVIDER_CLASSES: Record<Theme, string> = {
  light: "border-slate-200",
  dark: "border-slate-700",
};

export default function CollapsibleSection({
  title,
  description,
  theme = "light",
  tint = "default",
  badge,
  headerActions,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] =
    useState(defaultOpen);

  const isControlled =
    controlledOpen !== undefined &&
    onToggle !== undefined;

  const open = isControlled
    ? controlledOpen
    : internalOpen;

  function handleToggle() {
    if (isControlled) {
      onToggle();
    } else {
      setInternalOpen(
        (current) => !current
      );
    }
  }

  return (
    <section
      className={`overflow-hidden rounded-xl border shadow-sm ${CONTAINER_CLASSES[theme][tint]}`}
    >
      <div className="flex w-full items-center gap-3 px-4 py-2">
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-baseline justify-between gap-3 text-left"
        >
          <h5
            className={`shrink-0 text-base font-bold ${TITLE_CLASSES[theme]}`}
          >
            {title}
          </h5>

          {description ? (
            <p
              title={description}
              className={`truncate text-right text-xs leading-5 ${DESCRIPTION_CLASSES[theme]}`}
            >
              {description}
            </p>
          ) : null}
        </button>

        {headerActions}

        <div className="flex shrink-0 items-center gap-2">
          {badge}

          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={open}
            aria-label={
              open
                ? `Collapse ${title}`
                : `Expand ${title}`
            }
            className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${TOGGLE_CLASSES[theme]}`}
          >
            <PlusMinusIcon expanded={open} />
          </button>
        </div>
      </div>

      {open ? (
        <div
          className={`border-t p-4 ${DIVIDER_CLASSES[theme]}`}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
