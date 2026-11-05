import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), surface: v("surface"), "surface-2": v("surface-2"), border: v("border"), "border-strong": v("border-strong"),
        fg: v("fg"), muted: v("muted"), accent: v("accent"), "accent-fg": v("accent-fg"), "accent-soft": v("accent-soft"),
        go: v("go"), "go-soft": v("go-soft"), warn: v("warn"), "warn-soft": v("warn-soft"), nogo: v("nogo"), "nogo-soft": v("nogo-soft"),
        flag: v("flag"), "flag-soft": v("flag-soft"), proto: v("proto"), "proto-soft": v("proto-soft"), info: v("info"), "info-soft": v("info-soft"),
      },
      fontFamily: { sans: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"] },
      fontSize: { meta: ["12px", "16px"], body: ["14px", "20px"], section: ["18px", "26px"], title: ["30px", "36px"], metric: ["28px", "34px"] },
      maxWidth: { content: "1280px" },
      borderRadius: { sm: "4px", DEFAULT: "6px", md: "6px", lg: "8px", xl: "10px", "2xl": "12px" },
      boxShadow: { pop: "0 8px 24px -8px rgb(var(--shadow) / 0.18), 0 2px 6px -2px rgb(var(--shadow) / 0.08)", hair: "0 1px 2px rgb(var(--shadow) / 0.05)" },
      transitionDuration: { 140: "140ms", 150: "150ms", 160: "160ms", 180: "180ms", 200: "200ms" },
    },
  },
  plugins: [],
} satisfies Config;
