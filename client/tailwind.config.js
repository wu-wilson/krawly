import plugin from 'tailwindcss/plugin';

/** Reference a channel-based CSS custom property so Tailwind opacity modifiers resolve. */
const ch = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: ch('--ground'),
        surface: ch('--surface'),
        canvas: ch('--canvas'),
        ink: {
          DEFAULT: ch('--ink'),
          hover: ch('--ink-hover'),
          2: ch('--ink-2'),
          3: ch('--ink-3'),
          4: ch('--ink-4'),
        },
        line: {
          DEFAULT: ch('--line'),
          soft: ch('--line-soft'),
          strong: ch('--line-strong'),
        },
        wash: {
          row: ch('--wash-row'),
          well: ch('--wash-well'),
          hover: ch('--wash-hover'),
          track: ch('--wash-track'),
        },
        accent: ch('--accent'),
        broken: ch('--broken'),
        redirect: ch('--redirect'),
      },
      // A bare `border` uses the standard hairline.
      borderColor: {
        DEFAULT: ch('--line'),
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        // Product window on the landing page: a hairline lift plus two long, faint falloffs.
        window: '0 1px 2px rgb(var(--ink) / 0.03), 0 12px 32px -16px rgb(var(--ink) / 0.08), 0 32px 64px -40px rgb(var(--ink) / 0.1)',
        field: '0 1px 2px rgb(var(--ink) / 0.05)',
        segment: '0 0 0 1px rgb(var(--ink) / 0.06), 0 1px 2px rgb(var(--ink) / 0.06)',
        // Soft glows around a focused text field, red while it's invalid.
        focus: '0 0 0 3px rgb(var(--accent) / 0.14)',
        error: '0 0 0 3px rgb(var(--broken) / 0.1)',
        menu: '0 1px 2px rgb(var(--ink) / 0.04), 0 10px 28px -10px rgb(var(--ink) / 0.18)',
        sheet: '0 -12px 32px -20px rgb(var(--ink) / 0.18)',
        panel: '-12px 0 32px -24px rgb(var(--ink) / 0.14)',
      },
      keyframes: {
        'menu-in': {
          from: { opacity: '0', transform: 'translateY(-3px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'menu-in': 'menu-in 150ms cubic-bezier(0.25, 1, 0.5, 1)',
      },
      transitionTimingFunction: {
        quart: 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  // `hover:` styles apply only where the pointer can hover, so a tap doesn't leave a control looking hovered.
  future: {
    hoverOnlyWhenSupported: true,
  },
  // Nothing uses `.container`; without this, the word in comments pulls it into the build.
  corePlugins: {
    container: false,
  },
  plugins: [
    // `coarse:` sizes controls up for touch screens. It's a variant rather than a screen, since a non-width screen
    // would switch off Tailwind's `max-*` breakpoint variants.
    plugin(({ addVariant }) => addVariant('coarse', '@media (pointer: coarse)')),
  ],
};
