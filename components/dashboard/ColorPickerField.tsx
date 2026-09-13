"use client";

import { useState } from "react";

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : null;
}

export function ColorPickerField({
  id,
  name,
  defaultValue,
}: {
  id?: string;
  name: string;
  defaultValue: string;
}) {
  const [color, setColor] = useState(defaultValue);
  const [text, setText] = useState(defaultValue);

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={color}
        onChange={(e) => {
          setColor(e.target.value);
          setText(e.target.value);
        }}
        aria-label="Pick color"
        className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-border bg-surface/60"
      />
      <input
        type="text"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const normalized = normalizeHex(raw);
          if (normalized) setColor(normalized);
        }}
        onBlur={() => setText(color)}
        placeholder="#1e88e8"
        maxLength={7}
        className="h-11 w-28 rounded-xl border border-border bg-surface/60 px-3 text-sm text-foreground outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]"
      />
      <input type="hidden" name={name} value={color} />
    </div>
  );
}
