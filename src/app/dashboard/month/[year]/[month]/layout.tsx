export function generateStaticParams() {
  const params = []
  for (let year = 2024; year <= 2030; year++) {
    for (let month = 1; month <= 12; month++) {
      params.push({ year: String(year), month: String(month) })
    }
  }
  return params
}

export default function MonthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
