"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Participant, EventSettings } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, Clock, User, Calendar, MapPin } from "lucide-react"
import { motion } from "framer-motion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { dbHelpers } from "@/lib/supabase"

export default function ParticipantDashboard() {
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("participant_logged_in")
    const participantNumber = localStorage.getItem("participant_number")

    if (!isLoggedIn || !participantNumber) {
      router.push("/")
      return
    }

    fetchData(participantNumber)

    // Refresh setting setiap 5 detik untuk cek status absensi
    const interval = setInterval(() => loadEventSettings(), 5000)
    return () => clearInterval(interval)
  }, [router])

  const fetchData = async (participantNumber: string) => {
    try {
      console.log("Fetching participant data for:", participantNumber)

      const { data: participantData, error: participantError } =
        await dbHelpers.getParticipantByNumber(participantNumber)

      console.log("Participant fetch result:", { data: participantData, error: participantError })

      if (participantError) {
        console.error("Error fetching participant:", participantError)
        setMessage({
          type: "error",
          text: "Gagal memuat data peserta: " + participantError.message,
        })
        setLoading(false)
        return
      }

      if (!participantData) {
        console.error("No participant data found")
        setMessage({
          type: "error",
          text: "Data peserta tidak ditemukan",
        })
        setLoading(false)
        return
      }

      setParticipant(participantData)
      await loadEventSettings()
    } catch (error) {
      console.error("Error in fetchData:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadEventSettings = async () => {
    try {
      console.log("Loading event settings...")

      const { data: settingsData, error: settingsError } = await dbHelpers.getEventSettings()

      console.log("Event settings result:", { data: settingsData, error: settingsError })

      if (settingsError) {
        console.error("Error loading event settings:", settingsError)
        return
      }

      setEventSettings(settingsData)
    } catch (error) {
      console.error("Error loading event settings:", error)
    }
  }

  const handleAttendance = async () => {
    console.log("handleAttendance called")
    console.log("Participant:", participant)
    console.log("Event settings:", eventSettings)

    if (!participant) {
      console.error("No participant data")
      setMessage({
        type: "error",
        text: "Data peserta tidak tersedia",
      })
      return
    }

    if (!eventSettings) {
      console.error("No event settings")
      setMessage({
        type: "error",
        text: "Pengaturan event tidak tersedia",
      })
      return
    }

    if (!eventSettings.attendance_enabled) {
      console.log("Attendance not enabled")
      setMessage({
        type: "error",
        text: "Sistem absensi sedang tidak aktif",
      })
      return
    }

    if (participant.is_present) {
      console.log("Already present")
      setMessage({
        type: "error",
        text: "Anda sudah melakukan absensi sebelumnya",
      })
      return
    }

    setAttendanceLoading(true)
    setMessage(null)

    try {
      console.log("Updating attendance for participant ID:", participant.id)

      const { data, error } = await dbHelpers.updateAttendance(participant.id, true)

      console.log("Update attendance result:", { data, error })

      if (error) {
        console.error("Error updating attendance:", error)
        throw new Error(error.message || "Failed to update attendance")
      }

      console.log("Attendance updated successfully")

      setMessage({
        type: "success",
        text: "Absensi berhasil! Selamat datang di Parheheon Naposo HKBP Riau 2025",
      })

      // Update local participant state
      setParticipant({
        ...participant,
        is_present: true,
        attended_at: new Date().toISOString(),
      })

      // Refresh participant data from server
      const participantNumber = localStorage.getItem("participant_number")
      if (participantNumber) {
        setTimeout(() => {
          fetchData(participantNumber)
        }, 1000)
      }
    } catch (error) {
      console.error("Error in handleAttendance:", error)
      setMessage({
        type: "error",
        text: "Gagal melakukan absensi. Silakan coba lagi.",
      })
    } finally {
      setAttendanceLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("participant_logged_in")
    localStorage.removeItem("participant_number")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Memuat data...</p>
        </div>
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-red-600">Data peserta tidak ditemukan</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              Kembali ke Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-4">
      <div className="max-w-md mx-auto space-y-6 pt-10">
        {/* Header with Calendar Icon */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Calendar className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 drop-shadow">Parheheon Naposo HKBP Riau 2025</h1>
          <div className="flex items-center justify-center gap-2 text-white text-sm opacity-90">
            <MapPin className="h-4 w-4" />
            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-semibold">Riau</span>
          </div>
        </motion.div>

        {/* Message Alert */}
        {message && (
          <Alert
            variant={message.type === "error" ? "destructive" : "default"}
            className={message.type === "success" ? "border-green-200 bg-green-50" : ""}
          >
            <AlertDescription className={message.type === "success" ? "text-green-800" : ""}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Informasi Peserta Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-bold text-blue-700">Informasi Peserta</h2>
              </div>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Nomor Peserta</p>
                  <p className="text-2xl font-extrabold text-blue-600 tracking-wider">
                    {participant.participant_number}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Nama Lengkap</p>
                  <p className="text-lg font-bold text-gray-900">{participant.name}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Asal Kampus</p>
                  <p className="text-base text-gray-900">{participant.campus}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Acara Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-bold text-blue-700">Status Acara</h2>
              </div>
              <div className="text-center space-y-3">
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold shadow">
                  Sedang Berlangsung
                </div>
                <p className="text-sm text-gray-600">
                  Dimulai:{" "}
                  {eventSettings?.created_at
                    ? new Date(eventSettings.created_at).toLocaleDateString("id-ID") +
                      ", " +
                      new Date(eventSettings.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Attendance Status Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition">
            <CardContent className="p-6">
              {participant.is_present ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h2 className="text-lg font-bold text-green-700">Absensi Berhasil</h2>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Waktu absen:{" "}
                    {participant.attended_at
                      ? new Date(participant.attended_at).toLocaleDateString("id-ID") +
                        ", " +
                        new Date(participant.attended_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "-"}
                  </p>
                  <div className="inline-flex items-center px-8 py-3 bg-green-600 text-white rounded-lg font-bold shadow">
                    HADIR
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-blue-700">Absensi Kehadiran</h2>
                  </div>
                  {eventSettings?.attendance_enabled ? (
                    <>
                      <p className="text-gray-600 mb-4">Klik tombol di bawah untuk mencatat kehadiran Anda</p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handleAttendance}
                          disabled={attendanceLoading}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg shadow"
                        >
                          {attendanceLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Memproses...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              SAYA HADIR
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-4">Absensi belum dibuka oleh panitia</p>
                      <div className="inline-flex items-center px-8 py-3 bg-gray-400 text-white rounded-lg font-bold shadow">
                        BELUM AKTIF
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout Button */}
        <div className="pt-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-30 py-3 rounded-lg font-medium shadow"
          >
            Keluar
          </Button>
        </div>
      </div>
    </div>
  )
}
