'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  ChevronDown,
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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
    { href: '/month', label: 'Miesiąc', icon: Calendar },
    { href: '/year/2026', label: 'Rok', icon: BarChart3 },
    { href: '/accounts', label: 'Konta', icon: Wallet },
    { href: '/documents', label: 'Dokumenty', icon: FileText },
    { href: '/scan', label: 'Skanuj', icon: Camera },
    { href: '/categories', label: 'Kategorie', icon: Tags },
    { href: '/settings', label: 'Ustawienia', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#141418] border-r border-[#2a2a35] transform transition-transform duration-300 md:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-[#999] hover:text-[#ededed] hover:bg-[#1e1e24] transition group"
                >
                  <Icon className="w-5 h-5 group-hover:text-[#6c5ce7] transition" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-[#2a2a35] space-y-3">
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

          <div className="hidden md:flex items-center space-x-4">
            <select className="bg-[#1e1e24] border border-[#2a2a35] text-[#ededed] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c5ce7]">
              <option>Marzec 2026</option>
              <option>Luty 2026</option>
              <option>Styczeń 2026</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:opacity-80 transition">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141418] border-t border-[#2a2a35] z-40">
        <div className="flex justify-around">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center py-3 text-[#999] hover:text-[#6c5ce7] transition"
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

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
