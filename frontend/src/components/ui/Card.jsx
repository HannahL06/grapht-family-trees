export default function Card({ className = '', ...props }) {
  return <div className={`rounded-xl border border-rule bg-page p-8 ${className}`} {...props} />
}
