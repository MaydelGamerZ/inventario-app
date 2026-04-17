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
    <div ref={rootRef} className="relative sm:min-w-[240px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#050505] px-4 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.045]"
      >
        <span className="inline-flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300">
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
        <ChevronDown
          size={18}
          className={`shrink-0 text-zinc-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-[28px] border border-white/10 bg-[#050505] shadow-[0_22px_60px_rgba(0,0,0,0.6)]">
          <div className="border-b border-white/10 px-4 py-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-300">
              <Filter size={13} />
              Panel de control
            </div>
            <p className="mt-3 text-lg font-semibold text-white">
              Filtros del inventario
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Ajusta la vista sin salir del conteo.
            </p>
          </div>

          <div className="space-y-4 p-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Solo contados</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Muestra unicamente productos con captura.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={showOnlyCounted}
                  onChange={(e) => onToggleShowOnlyCounted?.(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                Orden
              </p>
              <CustomSelect
                value={sortMode}
                onChange={onSortChange}
                options={sortOptions}
                buttonClassName="min-h-[52px] bg-white/[0.03]"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                Visibilidad
              </p>

              <button
                type="button"
                onClick={() => {
                  onExpandAll?.();
                  setOpen(false);
                }}
                className="group flex min-h-[54px] w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-zinc-200 transition hover:bg-white/[0.045] hover:text-white"
              >
                <span className="inline-flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                    <ChevronDown size={16} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-medium">Expandir todo</span>
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-400">
                      Abre todas las categorias visibles.
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
                className="group flex min-h-[54px] w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-zinc-200 transition hover:bg-white/[0.045] hover:text-white"
              >
                <span className="inline-flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                    <ChevronUp size={16} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-medium">Contraer todo</span>
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-400">
                      Cierra todas las categorias visibles.
                    </span>
                  </span>
                </span>
                <ChevronDown size={16} className="rotate-180 text-zinc-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
