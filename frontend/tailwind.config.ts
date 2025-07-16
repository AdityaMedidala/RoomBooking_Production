/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
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
      colors: {
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
          DEFAULT: "hsl(var(--accent))",
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
          background: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: {
            DEFAULT: "hsl(var(--sidebar-primary))",
            foreground: "hsl(var(--sidebar-primary-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--sidebar-accent))",
            foreground: "hsl(var(--sidebar-accent-foreground))",
          },
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'], // ✅ Added futuristic Orbitron font
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        'float-1': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-10px) translateX(5px) rotate(5deg)' },
          '50%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '75%': { transform: 'translateY(10px) translateX(-5px) rotate(-5deg)' },
        },
        'float-2': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(10px) translateX(-5px) rotate(-5deg)' },
          '50%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '75%': { transform: 'translateY(-10px) translateX(5px) rotate(5deg)' },
        },
        'float-3': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-8px) translateX(-8px) rotate(4deg)' },
          '50%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '75%': { transform: 'translateY(8px) translateX(8px) rotate(-4deg)' },
        },
        'float-4': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(8px) translateX(8px) rotate(-4deg)' },
          '50%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '75%': { transform: 'translateY(-8px) translateX(-8px) rotate(4deg)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'float-1': 'float-1 15s ease-in-out infinite',
        'float-2': 'float-2 17s ease-in-out infinite reverse',
        'float-3': 'float-3 14s linear infinite',
        'float-4': 'float-4 16s ease-out infinite reverse',
      },
      backgroundImage: {
        'pattern-diagonal-lines': 'url("/img/diagonal-lines.png")',
        'playstation-wave': "url('/blue-wave-playstation.jpg')", // ✅ Added background image
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
