const base =
  'inline-flex items-center justify-center gap-2 text-sm font-medium cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'

const variants = {
  // The one primary action on a screen: the blue pill
  accent: 'min-h-9 px-[18px] rounded-full bg-accent text-on-accent hover:opacity-90',
  // Secondary: a hairline-outlined button
  soft: 'min-h-9 px-3.5 rounded-lg border border-rule bg-transparent text-ink hover:bg-hover',
  // Icon-only action that sits in a row (edit, delete...)
  row: 'size-9 rounded-lg border border-rule bg-transparent text-accent hover:bg-hover',
}

export default function Button({ variant = 'accent', className = '', type = 'button', ...props }) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props} />
}
