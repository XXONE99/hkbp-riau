"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Crown, Users, Shield, LogIn, User } from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { dbHelpers } from "@/lib/supabase"

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Form states
  const [nomorPeserta, setNomorPeserta] = useState("")
  const [adminUsername, setAdminUsername] = useState("")
  const [adminPassword, setAdminPassword] = useState("")

  useEffect(() => {
    // Clear any existing login data when accessing login page
    localStorage.removeItem("admin_logged_in")
    localStorage.removeItem("admin_username")
    localStorage.removeItem("participant_logged_in")
    localStorage.removeItem("participant_number")
  }, [])

  const handleLoginPeserta = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    console.log("Attempting participant login:", nomorPeserta)

    try {
      const { data, error } = await dbHelpers.getParticipantByNumber(nomorPeserta.trim())

      console.log("Participant login response:", { data: data ? "found" : "not found", error })

      if (error || !data) {
        console.error("Participant login failed:", error)
        setError("Nomor peserta tidak ditemukan. Pastikan nomor peserta benar.")
        setLoading(false)
        return
      }

      console.log("Participant login successful, redirecting...")
      localStorage.setItem("participant_logged_in", "true")
      localStorage.setItem("participant_number", nomorPeserta.trim().toUpperCase())

      toast({
        title: "Login Berhasil",
        description: `Selamat datang, ${data.name}!`,
      })

      router.push("/participant")
    } catch (error) {
      console.error("Participant login error:", error)
      setError("Terjadi kesalahan saat login. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  const handleLoginAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    console.log("Attempting admin login...")

    try {
      const { data, error } = await dbHelpers.adminLogin(adminUsername, adminPassword)

      console.log("Admin login response:", { data: data ? "success" : "failed", error })

      if (error || !data) {
        console.error("Admin login failed:", error)
        setError("Username atau password admin salah.")
        setLoading(false)
        return
      }

      console.log("Admin login successful, redirecting...")
      localStorage.setItem("admin_logged_in", "true")
      localStorage.setItem("admin_username", adminUsername)

      toast({
        title: "Login Admin Berhasil",
        description: "Selamat datang, Administrator!",
      })

      router.push("/admin")
    } catch (error) {
      console.error("Admin login error:", error)
      setError("Terjadi kesalahan saat login. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1464022077-eb4046c04204?ixlib=rb-4.0.3')] bg-cover bg-center opacity-10"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg"
            >
              <Crown className="w-10 h-10 text-white" />
            </motion.div>

            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-blue-900">HKBP Absensi</CardTitle>
              <p className="text-blue-700 font-medium">Parheheon Naposo Riau 2025</p>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="peserta" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="peserta" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Peserta
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {/* Login Peserta */}
              <TabsContent value="peserta" className="space-y-4">
                <div className="text-center space-y-2">
                  <User className="w-12 h-12 text-blue-600 mx-auto" />
                  <h3 className="font-semibold text-blue-900">Login Peserta</h3>
                  <p className="text-sm text-gray-600">Masukkan nomor peserta Anda</p>
                </div>

                <form onSubmit={handleLoginPeserta} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomorPeserta">Nomor Peserta</Label>
                    <Input
                      id="nomorPeserta"
                      type="text"
                      placeholder="Contoh: UI01, ITB01"
                      value={nomorPeserta}
                      onChange={(e) => setNomorPeserta(e.target.value)}
                      className="text-center font-mono text-lg"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Masuk...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Masuk sebagai Peserta
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-xs text-gray-500 text-center">
                  <p>Contoh nomor peserta: UI01, ITB01, UGM01</p>
                </div>
              </TabsContent>

              {/* Login Admin */}
              <TabsContent value="admin" className="space-y-4">
                <div className="text-center space-y-2">
                  <Shield className="w-12 h-12 text-blue-600 mx-auto" />
                  <h3 className="font-semibold text-blue-900">Login Admin</h3>
                  <p className="text-sm text-gray-600">Masukkan username dan password admin</p>
                </div>

                <form onSubmit={handleLoginAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Username admin"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password admin"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Masuk...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Masuk sebagai Admin
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-xs text-gray-500 text-center">
                  <p>Username: admin | Password: admin123</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-white/80"
        >
          <p className="text-sm">© 2025 HKBP Riau • Sistem Absensi Digital</p>
        </motion.div>
      </motion.div>
    </div>
  )
}
