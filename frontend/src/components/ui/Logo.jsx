/**
 * The Grapht logo (public/logo.png: navy lettering and roots on a transparent
 * background). Size it with a height class; the width follows. In dark mode
 * index.css turns it light so it stays readable on the dark page.
 */
export default function Logo({ className = 'h-14' }) {
  return <img src="/logo.png" width="967" height="448" alt="Grapht" className={`logo-img w-auto ${className}`} />
}
