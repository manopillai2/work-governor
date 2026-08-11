"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 7H2.5M2.5 7L6.5 3M2.5 7L6.5 11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Same button, both directions: on the flat control list it jumps to the
// Applications area; from anywhere inside /applications it jumps back to
// the control list.
export default function NavSwitchButton() {
  const pathname = usePathname();
  const onApplicationsRoute = pathname?.startsWith("/applications");

  return (
    <Link
      href={onApplicationsRoute ? "/" : "/applications"}
      className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
    >
      {onApplicationsRoute ? <BackArrowIcon /> : <GridIcon />}
      {onApplicationsRoute ? "Control View" : "Application View"}
    </Link>
  );
}
