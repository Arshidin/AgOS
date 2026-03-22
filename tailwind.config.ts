import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Original — landing, registration, login
        serif: ['"PT Serif"', "Georgia", "serif"],
        body: ["Source Sans 3", "system-ui", "sans-serif"],
        heading: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"DM Sans"', "-apple-system", "sans-serif"],
        // DS v11 — AppShell only
        inter: ["Inter", ...defaultTheme.fontFamily.sans],
        mono: ["JetBrains Mono", "Fira Code", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        // TURAN v11 semantic tokens
        turan: {
          bg: "var(--bg)",
          "bg-s": "var(--bg-s)",
          "bg-c": "var(--bg-c)",
          "bg-m": "var(--bg-m)",
          fg: "var(--fg)",
          fg2: "var(--fg2)",
          fg3: "var(--fg3)",
          bd: "var(--bd)",
          "bd-s": "var(--bd-s)",
          "bd-h": "var(--bd-h)",
          accent: "var(--accent)",
          cta: "var(--cta)",
          "cta-fg": "var(--cta-fg)",
          "cta-h": "var(--cta-h)",
          blue: "var(--blue)",
          green: "var(--green)",
          amber: "var(--amber)",
          red: "var(--red)",
        },
        // shadcn/ui compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent-hsl))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pill: "9999px",
      },
      boxShadow: {
        "turan-sm": "var(--sh-sm)",
        "turan-md": "var(--sh-md)",
        "turan-lg": "var(--sh-lg)",
        "turan-xl": "var(--sh-xl)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.85) translateY(8px)" },
          "50%": { opacity: "1", transform: "scale(1.04) translateY(-2px)" },
          "70%": { transform: "scale(0.98) translateY(1px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "bounce-in": "bounce-in 0.6s ease-out forwards",
        marquee: "marquee 10s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
