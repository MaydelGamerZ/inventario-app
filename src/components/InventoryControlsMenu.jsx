import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  Filter,
  Rows3,
} from 'lucide-react';
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
    if (!open || typeof document === 'undefined') return undefined;

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
    <div ref={rootRef} className="relative sm:min-w-[280px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group inline-flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#050505] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.045] hover:text-white"
      >
        <span className="inline-flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300 transition group-hover:text-white">
            <Filter size={16} />
          </span>
          <span className="flex min-w-0 flex-col text-left">
            <span className="truncate text-[15px] font-medium">
              Filtros y acciones
            </span>
            <span className="truncate text-xs text-zinc-500">
              Orden, conteos y visibilidad
            </span>
          </span>
        </span>
        <ChevronRight
          size={18}
          className={`shrink-0 text-zinc-500 transition group-hover:text-zinc-300 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,360px)] rounded-[28px] border border-white/10 bg-[#050505] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.6)]">
          <div className="space-y-1.5">
            <label className="group flex min-h-[58px] items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-zinc-300 transition hover:bg-white/[0.045] hover:text-white">
              <span className="inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300 transition group-hover:text-white">
                  <Eye size={16} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium">Solo contados</span>
                  <span className="text-xs text-zinc-500">
                    Mostrar solo productos capturados
                  </span>
                </span>
              </span>
              <input
                type="checkbox"
                checked={showOnlyCounted}
                onChange={(e) => onToggleShowOnlyCounted?.(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
            </label>

            <div className="rounded-2xl transition hover:bg-white/[0.045]">
              <CustomSelect
                value={sortMode}
                onChange={onSortChange}
                options={sortOptions}
                buttonClassName="min-h-[58px] border-0 bg-transparent px-4 py-3 hover:bg-transparent"
                leadingIcon={
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300">
                    <Rows3 size={16} />
                  </span>
                }
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onExpandAll?.();
                setOpen(false);
              }}
              className="group flex min-h-[58px] w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-zinc-300 transition hover:bg-white/[0.045] hover:text-white"
            >
              <span className="inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300 transition group-hover:text-white">
                  <ChevronDown size={16} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium">Expandir todo</span>
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-400">
                    Abrir categorias visibles
                  </span>
                </span>
              </span>
              <ChevronDown size={16} className="text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                onCollapseAll?.();
                setOpen(false);
              }}
              className="group flex min-h-[58px] w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-zinc-300 transition hover:bg-white/[0.045] hover:text-white"
            >
              <span className="inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300 transition group-hover:text-white">
                  <ChevronUp size={16} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium">Contraer todo</span>
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-400">
                    Cerrar categorias visibles
                  </span>
                </span>
              </span>
              <ChevronDown size={16} className="rotate-180 text-zinc-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
