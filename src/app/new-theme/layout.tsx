// Wraps every /new-theme/* preview page. The real app's globals.css
// recolors plain Tailwind utility classes like text-white/bg-white
// (scoped to the current data-theme, with !important) so its own
// components read correctly in both themes -- but that recoloring
// applies to any element carrying those class names anywhere in the
// document, including these unrelated, self-contained preview pages,
// where it silently mismatches text against background (and, in dark
// mode, adds a text-shadow halo meant for the rain background). This
// layout resets both effects for this subtree only.

export default function NewThemeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="preview-reset">
      <style>{`
        .preview-reset.preview-reset.preview-reset {
          text-shadow: none !important;
        }
        .preview-reset.preview-reset.preview-reset .text-white { color: #ffffff !important; }
        .preview-reset.preview-reset.preview-reset .bg-white { background-color: #ffffff !important; }
        .preview-reset.preview-reset.preview-reset .bg-amber-500 { background-color: #f59e0b !important; }
        .preview-reset.preview-reset.preview-reset .border-slate-800 { border-color: #1e293b !important; }
        .preview-reset.preview-reset.preview-reset .border-white\\/10 { border-color: rgba(255,255,255,0.1) !important; }
        .preview-reset.preview-reset.preview-reset .bg-black\\/60 { background-color: rgba(0,0,0,0.6) !important; }
        .preview-reset.preview-reset.preview-reset .text-amber-300 { color: #fcd34d !important; }
        .preview-reset.preview-reset.preview-reset .text-amber-700 { color: #b45309 !important; }
        .preview-reset.preview-reset.preview-reset .text-amber-800 { color: #92400e !important; }
        .preview-reset.preview-reset.preview-reset .text-emerald-700 { color: #047857 !important; }
        .preview-reset.preview-reset.preview-reset .text-green-700 { color: #15803d !important; }
        .preview-reset.preview-reset.preview-reset .text-red-700 { color: #b91c1c !important; }
        .preview-reset.preview-reset.preview-reset .text-slate-100 { color: #f1f5f9 !important; }
        .preview-reset.preview-reset.preview-reset .text-slate-300 { color: #cbd5e1 !important; }
        .preview-reset.preview-reset.preview-reset .text-slate-500 { color: #64748b !important; }
        .preview-reset.preview-reset.preview-reset .text-slate-700 { color: #334155 !important; }
        .preview-reset.preview-reset.preview-reset .hover\\:text-white:hover { color: #ffffff !important; }
        .preview-reset.preview-reset.preview-reset .hover\\:text-slate-200:hover { color: #e2e8f0 !important; }
      `}</style>
      {children}
    </div>
  );
}
