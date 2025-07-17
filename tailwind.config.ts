import type { Config } from 'tailwindcss';

const colors = {
  primary: {
    50: 'oklch(94.12% 0.026 281.14 / <alpha-value>)',
    100: 'oklch(87.36% 0.055 280.7 / <alpha-value>)',
    200: 'oklch(75.46% 0.112 278.3 / <alpha-value>)',
    300: 'oklch(63.14% 0.174 273.08 / <alpha-value>)',
    400: 'oklch(50.6% 0.218 266.25 / <alpha-value>)',
    500: 'oklch(38.02% 0.165 266.32 / <alpha-value>)',
    600: 'oklch(32.85% 0.142 266.16 / <alpha-value>)',
    700: 'oklch(28.48% 0.122 266.25 / <alpha-value>)',
    800: 'oklch(24.04% 0.103 266.41 / <alpha-value>)',
    900: 'oklch(18.29% 0.078 266.45 / <alpha-value>)',
    950: 'oklch(15.35% 0.065 265.58 / <alpha-value>)',
  },
};

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        backgroundPrimary: colors.primary[950],
        foregroundPrimary: colors.primary[100],
        linePrimary: colors.primary[50],
        highlight: colors.primary[300],
      },
    },
  },
  plugins: [],
};

export default config;
