"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, LogOut, QrCode, Crown, GraduationCap, Menu, X } from "lucide-react"
import { useState } from "react"

interface AdminLayoutProps {
  children: React.ReactNode
  activeTab?: "dashboard" | "users" | "scanner" | "campus"
  onTabChange?: (tab: "dashboard" | "users" | "scanner" | "campus") => void
}

export function AdminLayout({ children, activeTab = "dashboard", onTabChange }: AdminLayoutProps) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("admin_logged_in")
    localStorage.removeItem("admin_username")
    router.push("/")
  }

  const handleTabChange = (tab: "dashboard" | "users" | "scanner" | "campus") => {
    if (onTabChange) {
      onTabChange(tab)
    }
    setIsMobileMenuOpen(false) // Close mobile menu when tab changes
  }

  const menuItems = [
    {
      id: "dashboard" as const,
      label: "Dashboard Admin",
      icon: LayoutDashboard,
    },
    {
      id: "users" as const,
      label: "Kelola Peserta",
      icon: Users,
    },
    {
      id: "campus" as const,
      label: "Kelola Kampus",
      icon: GraduationCap,
    },
    {
      id: "scanner" as const,
      label: "Scan Barcode",
      icon: QrCode,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Fixed Height */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between h-16 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <Crown className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-blue-900 font-bold text-sm">Admin Panel</h2>
            <p className="text-xs text-gray-500">HKBP Riau 2025</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Content Spacer */}
      <div className="lg:hidden h-16"></div>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar - Fixed Width and Height */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
          <div className="flex flex-col h-full bg-white shadow-lg border-r">
            {/* Logo Header - Fixed Height */}
            <div className="h-20 p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 flex items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center shadow-md">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Parheheon Naposo 2025</h2>
                  <p className="text-blue-100 text-xs">Admin Panel</p>
                </div>
              </div>
            </div>

            {/* Panel Admin Label - Fixed Height */}
            <div className="h-12 px-6 py-3 bg-gray-50 border-b flex items-center flex-shrink-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">PANEL ADMIN</p>
            </div>

            {/* Navigation - Flexible Height */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-sm font-medium group",
                      activeTab === item.id
                        ? "bg-blue-600 text-white shadow-md transform scale-[1.02]"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        activeTab === item.id ? "text-white" : "text-gray-500 group-hover:text-gray-700",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Admin Info - Fixed Height */}
            <div className="h-24 p-4 border-t bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">Administrator</p>
                  <p className="text-xs text-gray-500">HKBP Riau</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 text-sm h-8 px-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Keluar
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar - Full Screen Overlay */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu */}
            <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div className="h-16 px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                      <Crown className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-sm">Admin Panel</h2>
                      <p className="text-blue-100 text-xs">HKBP Riau 2025</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-2"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Mobile Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-sm font-medium",
                          activeTab === item.id
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </nav>

                {/* Mobile Admin Info */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">A</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Administrator</p>
                      <p className="text-xs text-gray-500">HKBP Riau</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Keluar
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Main content */}
        <div className="flex-1 lg:ml-64">
          <div className="min-h-screen bg-gray-50">{children}</div>
        </div>
      </div>
    </div>
  )
}
