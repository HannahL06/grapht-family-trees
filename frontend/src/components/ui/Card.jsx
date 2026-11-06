export default function Card({ className = '', ...props }) {
  return <div className={`rounded-2xl border-2 border-rule bg-page p-6 ${className}`} {...props} />
}
