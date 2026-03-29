export function generateStaticParams() {
  const params = []
  for (let year = 2024; year <= 2030; year++) {
    params.push({ year: String(year) })
  }
  return params
}

export default function YearLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
