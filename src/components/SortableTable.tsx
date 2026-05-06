import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

export function useSort<T>(
  items: T[],
  getters: Record<string, (row: T) => any>,
  initial?: { key: string; dir?: SortDir }
) {
  const [sortKey, setSortKey] = useState<string | null>(initial?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(initial?.dir ?? "asc");

  const toggle = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey || !getters[sortKey]) return items;
    const get = getters[sortKey];
    const arr = [...items];
    arr.sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [items, sortKey, sortDir, getters]);

  return { sorted, sortKey, sortDir, toggle };
}

interface SortableTHProps {
  sortKey?: string;
  currentKey?: string | null;
  dir?: SortDir;
  onToggle?: (key: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const SortableTH = ({
  sortKey,
  currentKey,
  dir,
  onToggle,
  className = "",
  children,
}: SortableTHProps) => {
  const isActive = sortKey && currentKey === sortKey;
  const sortable = !!sortKey && !!onToggle;
  return (
    <th className={`text-left p-3 font-medium ${className}`}>
      {sortable ? (
        <button
          type="button"
          onClick={() => onToggle!(sortKey!)}
          className="inline-flex items-center gap-1 hover:text-primary transition-colors select-none"
          title={`Sort ${isActive && dir === "asc" ? "descending" : "ascending"}`}
        >
          <span>{children}</span>
          {isActive ? (
            dir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      ) : (
        <span>{children}</span>
      )}
    </th>
  );
};
