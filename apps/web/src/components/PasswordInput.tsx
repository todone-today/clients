"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// A password field with an eye that shows what you typed (handy on phones, where typos are easy to make).
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <span className="pwField">
      <input {...props} type={shown ? "text" : "password"} />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
      >
        {shown ? <EyeOff size={18} strokeWidth={2.5} aria-hidden /> : <Eye size={18} strokeWidth={2.5} aria-hidden />}
      </button>
    </span>
  );
}
