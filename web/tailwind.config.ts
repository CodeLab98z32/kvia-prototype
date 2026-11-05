import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), surface: v("surface"), "surface-2": v("surface-2"), border: v("border"), fg: v("fg"),
        muted: v("muted"), accent: v("accent"), "accent-fg": v("accent-fg"), "accent-soft": v("accent-soft"),
        go: v("go"), "go-soft": v("go-soft"), warn: v("warn"), "warn-soft": v("warn-soft"),
        nogo: v("nogo"), "nogo-soft": v("nogo-soft"), flag: v("flag"), "flag-soft": v("flag-soft"),
        proto: v("proto"), "proto-soft": v("proto-soft"), info: v("info"), "info-soft": v("info-soft"),
      },
      fontFamily: { sans: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"] },
      maxWidth: { content: "1280px" },
      // Restrained corner radii (team feedback: rounded corners, but not "soft").
      borderRadius: { sm: "2px", DEFAULT: "3px", md: "4px", lg: "5px", xl: "6px", "2xl": "8px" },
      keyframes: {
        progress: { "0%": { width: "0%" }, "100%": { width: "100%" } },
        fadein: { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "none" } },
      },
      animation: { progress: "progress 1.4s ease-in-out forwards", fadein: "fadein .3s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;
