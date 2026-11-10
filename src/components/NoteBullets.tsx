import { formatNoteBullets } from "@/services/noteFormat";

// Renders a note's text as short bullets (see services/noteFormat.ts).
// Inherits font size and text color from the parent, so every caller
// keeps its own theme/struck-through styling.
export function NoteBullets({
  text,
}: {
  text: string;
}) {
  const bullets = formatNoteBullets(text);

  if (bullets.length <= 1 && !bullets[0]?.items) {
    return (
      <p>
        {bullets[0]?.label ? (
          <span className="font-semibold">
            {bullets[0].label}:{" "}
          </span>
        ) : null}
        {bullets[0]?.text ?? text}
      </p>
    );
  }

  return (
    <ul className="list-disc space-y-1 pl-4 marker:opacity-50">
      {bullets.map((bullet, index) => (
        <li key={index}>
          {bullet.label ? (
            <span className="font-semibold">
              {bullet.label}
              {bullet.items ? "" : ":"}
            </span>
          ) : null}

          {bullet.text ? (
            <>
              {bullet.label ? " " : null}
              {bullet.text}
            </>
          ) : null}

          {bullet.items && bullet.compact ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {bullet.items.map((item, itemIndex) => (
                <span
                  key={itemIndex}
                  className="rounded border border-current/20 px-1.5 py-px font-mono text-[10px] leading-4"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          {bullet.items && !bullet.compact ? (
            <ul className="mt-0.5 list-[circle] space-y-0.5 pl-4 marker:opacity-50">
              {bullet.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
