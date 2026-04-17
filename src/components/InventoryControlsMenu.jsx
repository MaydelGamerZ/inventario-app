import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function InventoryControlsMenu({
  sortMode,
  onSortChange,
  sortOptions = [],
  showOnlyCounted = false,
  onToggleShowOnlyCounted,
  onExpandAll,
  onCollapseAll,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative sm:min-w-[240px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#080808] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
      >
        <span className="inline-flex items-center gap-2">
          <Filter size={16} />
          Filtros y acciones
        </span>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,340px)] rounded-[24px] border border-white/10 bg-[#050505] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.6)]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <label className="flex items-center justify-between gap-3 text-sm text-zinc-200">
                <span>Solo contados</span>
                <input
                  type="checkbox"
                  checked={showOnlyCounted}
                  onChange={(e) => onToggleShowOnlyCounted?.(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                Orden
              </p>
              <CustomSelect
                value={sortMode}
                onChange={onSortChange}
                options={sortOptions}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  onExpandAll?.();
                  setOpen(false);
                }}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.06]"
              >
                <ChevronDown size={16} />
                Expandir todo
              </button>

              <button
                type="button"
                onClick={() => {
                  onCollapseAll?.();
                  setOpen(false);
                }}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.06]"
              >
                <ChevronUp size={16} />
                Contraer todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
