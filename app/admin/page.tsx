"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { AdminDashboard } from "@/components/admin-dashboard"
import { AdminUsers } from "@/components/admin-users"
import { AdminCampus } from "@/components/admin-campus"
import { AdminScanner } from "@/components/admin-scanner"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "scanner" | "campus">("dashboard")
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const adminLoggedIn = localStorage.getItem("admin_logged_in")
      if (adminLoggedIn === "true") {
        setIsAuthenticated(true)
      } else {
        router.push("/")
      }
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard />
      case "users":
        return <AdminUsers />
      case "campus":
        return <AdminCampus />
      case "scanner":
        return <AdminScanner />
      default:
        return <AdminDashboard />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  )
}
