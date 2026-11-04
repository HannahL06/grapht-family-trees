const base =
  'inline-flex items-center justify-center gap-2 font-medium cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'

const variants = {
  accent: 'min-h-11 px-6 rounded-full bg-accent text-on-accent',
  soft: 'min-h-11 px-6 rounded-full bg-chrome text-ink',
  // Icon-only action that sits in a row (edit, delete...)
  row: 'size-11 rounded-full bg-transparent text-accent hover:bg-chrome',
}

export default function Button({ variant = 'accent', className = '', type = 'button', ...props }) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props} />
}
