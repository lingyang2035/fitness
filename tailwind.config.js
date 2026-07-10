/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/templates/**/*.html",
    "./static/js/**/*.js",
  ],
  safelist: [
    // Classes dynamically assigned via JS className that the scanner may miss
    'opacity-100',
    'opacity-0',
    'translate-y-0',
    'translate-y-full',
    'pointer-events-none',
    'flex-1',
    'py-2',
    'py-2.5',
    'rounded-xl',
    'text-xs',
    'font-bold',
    'font-semibold',
    'shadow-sm',
    'bg-indigo-600',
    'text-white',
    'text-indigo-400',
    'text-zinc-400',
    'transition-all',
    'scale-95',
    'scale-100',
    'opacity-70',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
