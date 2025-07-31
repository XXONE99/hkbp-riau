"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Users, UserCheck, UserX, TrendingUp, Calendar, Settings, Clock } from "lucide-react"
import { dbHelpers } from "@/lib/supabase"
import type { Participant, EventSettings } from "@/lib/supabase"

export function AdminDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingAttendance, setUpdatingAttendance] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()

    // Auto-refresh every 30 seconds to show real-time updates
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [participantsResult, settingsResult] = await Promise.all([
        dbHelpers.getParticipants(),
        dbHelpers.getEventSettings(),
      ])

      if (participantsResult.error) {
        console.error("Error loading participants:", participantsResult.error)
      } else {
        setParticipants(participantsResult.data || [])
      }

      if (settingsResult.error) {
        console.error("Error loading event settings:", settingsResult.error)
      } else {
        setEventSettings(settingsResult.data)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data dashboard",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceToggle = async (enabled: boolean) => {
    if (!eventSettings) return

    setUpdatingAttendance(true)

    try {
      console.log("Updating attendance status to:", enabled)

      const { data, error } = await dbHelpers.updateEventSettings({
        attendance_enabled: enabled,
      })

      if (error) {
        console.error("Error updating attendance status:", error)
        toast({
          title: "Error",
          description: "Gagal mengubah status absensi",
          variant: "destructive",
        })
        return
      }

      console.log("Attendance status updated successfully:", data)

      setEventSettings(data)
      toast({
        title: "Berhasil",
        description: `Absensi ${enabled ? "diaktifkan" : "dinonaktifkan"}`,
      })
    } catch (error) {
      console.error("Error updating attendance status:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan sistem",
        variant: "destructive",
      })
    } finally {
      setUpdatingAttendance(false)
    }
  }

  // Calculate statistics
  const totalParticipants = participants.length
  const presentParticipants = participants.filter((p) => p.is_present).length
  const absentParticipants = totalParticipants - presentParticipants
  const attendanceRate = totalParticipants > 0 ? Math.round((presentParticipants / totalParticipants) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Dashboard Admin</h1>
        <p className="text-gray-600">Pantau statistik kehadiran dan kelola sistem absensi</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Peserta</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalParticipants}</div>
            <p className="text-xs text-gray-500 mt-1">Terdaftar dalam sistem</p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Hadir</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentParticipants}</div>
            <p className="text-xs text-gray-500 mt-1">Sudah melakukan absensi</p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Belum Hadir</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentParticipants}</div>
            <p className="text-xs text-gray-500 mt-1">Belum melakukan absensi</p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tingkat Kehadiran</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{attendanceRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Dari total peserta</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Information */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informasi Event
          </CardTitle>
          <CardDescription>Detail acara yang sedang berlangsung</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="font-medium text-gray-700">Nama Event: </span>
              <span className="text-gray-900">{eventSettings?.event_name || "Parheheon HKBP Riau 2025"}</span>
            </div>
            <Badge variant={eventSettings?.attendance_enabled ? "default" : "secondary"} className="w-fit">
              {eventSettings?.attendance_enabled ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Kontrol Absensi:</span>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                checked={eventSettings?.attendance_enabled || false}
                onCheckedChange={handleAttendanceToggle}
                disabled={updatingAttendance}
                className="data-[state=checked]:bg-green-600"
              />
              <span className="text-sm text-gray-600">
                {eventSettings?.attendance_enabled ? "Aktifkan" : "Nonaktifkan"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-blue-700 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Aktivitas Terbaru
          </CardTitle>
          <CardDescription className="text-gray-500">Peserta yang baru saja melakukan absensi</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-3">
              {participants
                .filter((p) => p.is_present && p.attended_at)
                .sort((a, b) => new Date(b.attended_at!).getTime() - new Date(a.attended_at!).getTime())
                .slice(0, 5)
                .map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      {/* Avatar with initials */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{participant.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {participant.participant_number}
                          </Badge>
                          <span className="truncate">{participant.campus}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">
                        {participant.attended_at
                          ? new Date(participant.attended_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {participant.attended_at
                          ? new Date(participant.attended_at).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                            })
                          : ""}
                      </div>
                    </div>
                  </div>
                ))}

              {participants.filter((p) => p.is_present).length === 0 && (
                <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-500">Belum ada aktivitas</p>
                  <p className="text-sm text-gray-400 mt-1">Peserta yang hadir akan muncul di sini</p>
                </div>
              )}

              {participants.filter((p) => p.is_present).length > 5 && (
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Dan {participants.filter((p) => p.is_present).length - 5} peserta lainnya telah hadir
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
