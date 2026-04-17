import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Selecciona una opcion',
  disabled = false,
  leadingIcon = null,
  className = '',
  buttonClassName = '',
  menuClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listboxId = useId();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  );

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

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={[
          'inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#080808] px-4 py-2 text-left text-sm text-white transition',
          'outline-none hover:border-white/20 hover:bg-white/[0.05] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          buttonClassName,
        ].join(' ')}
      >
        <span className="flex min-w-0 items-center gap-3">
          {leadingIcon}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </span>

        <ChevronDown
          size={16}
          className={`shrink-0 text-zinc-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={[
            'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#050505] p-1 shadow-[0_22px_60px_rgba(0,0,0,0.6)]',
            menuClassName,
          ].join(' ')}
        >
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => handleSelect(option.value)}
                className={[
                  'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                  selected
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-200 hover:bg-white/[0.06] hover:text-white',
                ].join(' ')}
              >
                <span className="truncate">{option.label}</span>
                <Check
                  size={15}
                  className={selected ? 'opacity-100' : 'opacity-0'}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
