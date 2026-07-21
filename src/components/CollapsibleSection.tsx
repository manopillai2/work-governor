"use client";

import { useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Tint = "default" | "accent" | "warning";

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  theme?: Theme;
  tint?: Tint;
  badge?: ReactNode;
  defaultOpen?: boolean;
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
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(
    defaultOpen
  );

  return (
    <section
      className={`overflow-hidden rounded-xl border ${CONTAINER_CLASSES[theme][tint]}`}
    >
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <h5
            className={`font-medium ${TITLE_CLASSES[theme]}`}
          >
            {title}
          </h5>

          {description ? (
            <p
              className={`mt-1 text-sm leading-6 ${DESCRIPTION_CLASSES[theme]}`}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {badge}

          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-sm ${TOGGLE_CLASSES[theme]}`}
          >
            {open ? "−" : "+"}
          </span>
        </div>
      </button>

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
