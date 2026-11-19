// Line diff (Myers O((N+M)D)) for reviewing collector script changes.
// Returns hunks with a few lines of context; null when the inputs are too
// different to diff cheaply (show the full script instead).

export type DiffLine = { kind: "same" | "add" | "del"; text: string; oldNo?: number; newNo?: number };

export function diffLines(a: string, b: string, maxD = 4000): DiffLine[] | null {
  const A = a.split("\n");
  const B = b.split("\n");
  const N = A.length;
  const M = B.length;
  const max = Math.min(N + M, maxD);
  const off = max + 1;
  let v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = false;
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice());
    const next = v.slice();
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < N && y < M && A[x] === B[y]) {
        x++;
        y++;
      }
      next[off + k] = x;
      if (x >= N && y >= M) {
        found = true;
        break;
      }
    }
    v = next;
  }
  if (!found) return null;
  trace.push(v);

  // Backtrack.
  const out: DiffLine[] = [];
  let x = N;
  let y = M;
  for (let d = trace.length - 2; d >= 0 && (x > 0 || y > 0); d--) {
    const vd = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && vd[off + k - 1] < vd[off + k + 1]) ? k + 1 : k - 1;
    const prevX = vd[off + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      out.push({ kind: "same", text: A[x - 1], oldNo: x, newNo: y });
      x--;
      y--;
    }
    if (d === 0) break;
    if (x === prevX) {
      out.push({ kind: "add", text: B[y - 1], newNo: y });
      y--;
    } else {
      out.push({ kind: "del", text: A[x - 1], oldNo: x });
      x--;
    }
  }
  while (x > 0 && y > 0) {
    out.push({ kind: "same", text: A[x - 1], oldNo: x, newNo: y });
    x--;
    y--;
  }
  return out.reverse();
}

// Collapse unchanged runs to `context` lines around each change.
export function hunks(lines: DiffLine[], context = 3): Array<DiffLine | { kind: "gap"; count: number }> {
  const keep = new Array(lines.length).fill(false);
  lines.forEach((l, i) => {
    if (l.kind !== "same") for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) keep[j] = true;
  });
  const out: Array<DiffLine | { kind: "gap"; count: number }> = [];
  let gap = 0;
  lines.forEach((l, i) => {
    if (keep[i]) {
      if (gap) out.push({ kind: "gap", count: gap });
      gap = 0;
      out.push(l);
    } else gap++;
  });
  if (gap) out.push({ kind: "gap", count: gap });
  return out;
}
