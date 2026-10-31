"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import s from "./Select.module.css";

export type Option = { value: string; label: string };

// The app's dropdown: a button and a list styled like the rest of todone (native menus can't be).
// Keyboard: Enter/Space/↓ open it, ↑↓ move, Enter picks, Esc or Tab closes; typing a letter jumps to it.
export function Select({
  value,
  options,
  onChange,
  label,
  className,
  placeholder,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string; // what it's for, for screen readers
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    addEventListener("pointerdown", away);
    return () => removeEventListener("pointerdown", away);
  }, [open]);

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (i: number) => {
    setOpen(false);
    button.current?.focus();
    if (options[i] && options[i].value !== value) onChange(options[i].value);
  };
  const key = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div className={`${s.select} ${className ?? ""}`} ref={box}>
      <button
        ref={button}
        type="button"
        className={s.button}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? placeholder ?? "none"}`}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={key}
      >
        <span>{current?.label ?? placeholder ?? ""}</span>
        <ChevronDown size={16} strokeWidth={2.5} aria-hidden />
      </button>
      {open && (
        <ul className={s.list} role="listbox" id={id} aria-label={label}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.value === value}
              data-active={i === active}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(i)}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={14} strokeWidth={3} aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
