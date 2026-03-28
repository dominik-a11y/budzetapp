'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Wallet,
  FileText,
  Camera,
  Tags,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Upload,
  MoreHorizontal,
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    getUser()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: `/dashboard/month/${currentYear}/${currentMonth}`, label: 'Bieżący miesiąc', icon: Calendar },
    { href: `/dashboard/year/${currentYear}`, label: 'Rok ' + currentYear, icon: BarChart3 },
    { href: '/dashboard/accounts', label: 'Konta', icon: Wallet },
    { href: '/dashboard/import', label: 'Import CSV', icon: Upload },
    { href: '/dashboard/documents', label: 'Dokumenty', icon: FileText },
    { href: '/dashboard/scan', label: 'Skanuj paragon', icon: Camera },
    { href: '/dashboard/categories', label: 'Kategorie', icon: Tags },
    { href: '/dashboard/settings', label: 'Ustawienia', icon: Settings },
  ]

  const mobileNavItems = [
    { href: '/dashboard', label: 'Główna', icon: LayoutDashboard },
    { href: `/dashboard/month/${currentYear}/${currentMonth}`, label: 'Miesiąc', icon: Calendar },
    { href: '/dashboard/scan', label: 'Skanuj', icon: Camera },
    { href: '/dashboard/settings', label: 'Ustawienia', icon: Settings },
  ]

  const moreMenuItems = [
    { href: `/dashboard/year/${currentYear}`, label: 'Widok roczny', icon: BarChart3 },
    { href: '/dashboard/accounts', label: 'Konta', icon: Wallet },
    { href: '/dashboard/import', label: 'Import CSV', icon: Upload },
    { href: '/dashboard/documents', label: 'Dokumenty', icon: FileText },
    { href: '/dashboard/categories', label: 'Kategorie', icon: Tags },
  ]

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#141418] border-r border-[#2a2a35] transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'max-md:-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-[#2a2a35]">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 hover:opacity-80 transition"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="font-bold text-lg text-[#ededed]">BudżetApp</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition group ${
                    isActive
                      ? 'bg-[#6c5ce7]/10 text-[#6c5ce7]'
                      : 'text-[#999] hover:text-[#ededed] hover:bg-[#1e1e24]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    isActive ? 'text-[#6c5ce7]' : 'group-hover:text-[#6c5ce7]'
                  } transition`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-[#2a2a35] space-y-2">
            {userEmail && (
              <p className="px-4 text-xs text-[#666] truncate">{userEmail}</p>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-[#999] hover:text-[#e17055] hover:bg-[#1e1e24] transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Wyloguj się</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-0">
        {/* Header */}
        <header className="bg-[#141418] border-b border-[#2a2a35] px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-[#1e1e24] rounded-lg transition"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6 text-[#ededed]" />
            ) : (
              <Menu className="w-6 h-6 text-[#ededed]" />
            )}
          </button>

          <div className="hidden md:flex items-center space-x-3">
            {pathname !== '/dashboard' && (
              <Link
                href="/dashboard"
                className="flex items-center space-x-1.5 text-[#999] hover:text-[#ededed] transition text-sm mr-2"
              >
                <Home className="w-4 h-4" />
                <span>Główna</span>
              </Link>
            )}
            <MonthNavigator currentYear={currentYear} currentMonth={currentMonth} />
          </div>

          {/* Mobile: back to dashboard */}
          {pathname !== '/dashboard' && (
            <Link
              href="/dashboard"
              className="md:hidden flex items-center space-x-1 text-[#999] hover:text-[#ededed] transition text-sm"
            >
              <Home className="w-4 h-4" />
              <span>Główna</span>
            </Link>
          )}

          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/scan"
              className="hidden md:flex items-center space-x-1.5 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Skanuj</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center text-white font-semibold text-sm hover:opacity-80 transition"
            >
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141418] border-t border-[#2a2a35] z-40">
        {/* More menu popup */}
        {moreMenuOpen && (
          <div className="absolute bottom-full right-0 left-0 bg-[#141418] border-t border-[#2a2a35] shadow-lg">
            <div className="grid grid-cols-3 gap-1 p-3">
              {moreMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreMenuOpen(false)}
                    className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg transition ${
                      isActive ? 'text-[#6c5ce7] bg-[#6c5ce7]/10' : 'text-[#999] hover:text-[#6c5ce7] hover:bg-[#1e1e24]'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreMenuOpen(false)}
                className={`flex-1 flex flex-col items-center justify-center py-3 transition ${
                  isActive ? 'text-[#6c5ce7]' : 'text-[#999] hover:text-[#6c5ce7]'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`flex-1 flex flex-col items-center justify-center py-3 transition ${
              moreMenuOpen ? 'text-[#6c5ce7]' : 'text-[#999] hover:text-[#6c5ce7]'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" />
            <span className="text-xs">Więcej</span>
          </button>
        </div>
      </nav>

      {/* More menu overlay */}
      {moreMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30"
          onClick={() => setMoreMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

function MonthNavigator({ currentYear, currentMonth }: { currentYear: number; currentMonth: number }) {
  const router = useRouter()

  // Generate last 6 months as options
  const options: { year: number; month: number; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    let m = currentMonth - i
    let y = currentYear
    if (m < 1) { m += 12; y-- }
    options.push({ year: y, month: m, label: `${MONTH_NAMES[m - 1]} ${y}` })
  }

  return (
    <select
      defaultValue={`${currentYear}-${currentMonth}`}
      onChange={(e) => {
        const [y, m] = e.target.value.split('-')
        router.push(`/dashboard/month/${y}/${m}`)
      }}
      className="bg-[#1e1e24] border border-[#2a2a35] text-[#ededed] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c5ce7] cursor-pointer"
    >
      {options.map(o => (
        <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
