"use client"

import type React from "react"

import { useState, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { type Participant, dbHelpers } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Upload, QrCode, Search, CheckCircle, X, AlertCircle, BarChart3, Camera } from "lucide-react"
import { BarcodeScanner } from "./barcode-scanner-simple"
import { processBarcodeImage, type BarcodeProcessResult } from "@/lib/barcode-image-processor"
import { Switch } from "@/components/ui/switch"
import { CodeDisplayModal } from "./code-display-modal"

export function AdminScanner() {
  const [scannedCode, setScannedCode] = useState("")
  const [foundParticipant, setFoundParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState<BarcodeProcessResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [autoAttendanceEnabled, setAutoAttendanceEnabled] = useState(true)

  // Code display modal state
  const [showCodeModal, setShowCodeModal] = useState(false)

  // OPTIMIZED: Cache untuk menghindari duplicate API calls
  const participantCache = useRef<Map<string, Participant>>(new Map())
  const lastProcessedCode = useRef<string>("")

  // OPTIMIZED: Debounce untuk menghindari spam API calls
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  // OPTIMIZED: Memoized search function dengan caching
  const searchParticipant = useCallback(async (code: string, skipToast = false) => {
    if (!code.trim()) return null

    // Check cache first untuk instant response
    if (participantCache.current.has(code)) {
      const cachedParticipant = participantCache.current.get(code)!
      setFoundParticipant(cachedParticipant)
      if (!skipToast) {
        toast({
          title: "Peserta Ditemukan (Cache)",
          description: `${cachedParticipant.name} - ${cachedParticipant.participant_number}`,
          duration: 2000,
        })
      }
      return cachedParticipant
    }

    setLoading(true)
    try {
      const { data, error } = await dbHelpers.getParticipantByNumber(code)

      if (error || !data) {
        setFoundParticipant(null)
        if (!skipToast) {
          toast({
            title: "Peserta Tidak Ditemukan",
            description: `Nomor peserta "${code}" tidak terdaftar`,
            variant: "destructive",
            duration: 3000,
          })
        }
        return null
      }

      // Cache the result untuk future calls
      participantCache.current.set(code, data)
      setFoundParticipant(data)
      
      if (!skipToast) {
        toast({
          title: "✅ Peserta Ditemukan",
          description: `${data.name} - ${data.participant_number}`,
          duration: 2000,
        })
      }

      return data
    } catch (error) {
      if (!skipToast) {
        toast({
          title: "Error",
          description: "Gagal mencari peserta",
          variant: "destructive",
        })
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [toast])

  // OPTIMIZED: Fast attendance update dengan optimistic UI update
  const fastAttendanceUpdate = useCallback(async (participant: Participant) => {
    if (participant.is_present) {
      toast({
        title: "ℹ️ Sudah Hadir",
        description: `${participant.name} sudah tercatat hadir sebelumnya`,
        duration: 2000,
      })
      return participant
    }

    // OPTIMISTIC UPDATE: Update UI immediately
    const optimisticParticipant = { ...participant, is_present: true, attended_at: new Date().toISOString() }
    setFoundParticipant(optimisticParticipant)
    participantCache.current.set(participant.participant_number, optimisticParticipant)

    // Show success immediately
    toast({
      title: "🎯 Hadir Tercatat!",
      description: `${participant.name} - Kehadiran berhasil dicatat`,
      duration: 3000,
    })

    // Background API call - tidak blocking UI
    try {
      const { error } = await dbHelpers.updateAttendance(participant.id, true)
      
      if (error) {
        // Rollback optimistic update jika gagal
        setFoundParticipant(participant)
        participantCache.current.set(participant.participant_number, participant)
        
        toast({
          title: "❌ Gagal Update Database",
          description: "Silakan coba lagi atau gunakan tombol manual",
          variant: "destructive",
        })
        return participant
      }

      // Update cache dengan data terbaru dari server
      const updatedParticipant = { ...optimisticParticipant }
      participantCache.current.set(participant.participant_number, updatedParticipant)
      
    } catch (error) {
      console.error("Background attendance update error:", error)
      // Rollback on error
      setFoundParticipant(participant)
      participantCache.current.set(participant.participant_number, participant)
      
      toast({
        title: "❌ Network Error",
        description: "Silakan periksa koneksi internet",
        variant: "destructive",
      })
    }

    return optimisticParticipant
  }, [toast])

  // OPTIMIZED: Ultra-fast barcode handler dengan immediate UI update
  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    const cleanBarcode = barcode.trim()
    if (!cleanBarcode) return

    // Skip jika kode sama dengan yang sebelumnya dalam 2 detik terakhir
    if (lastProcessedCode.current === cleanBarcode) {
      console.log("🔄 Skipping duplicate code:", cleanBarcode)
      return
    }

    console.log("🎯 FAST PROCESSING:", cleanBarcode)
    lastProcessedCode.current = cleanBarcode

    // Clear timeout untuk reset duplicate protection
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }
    debounceTimeout.current = setTimeout(() => {
      lastProcessedCode.current = ""
    }, 2000)

    // INSTANT UI UPDATE
    setScannedCode(cleanBarcode)

    // IMMEDIATE: Show detection toast
    toast({
      title: "🎯 Kode Terdeteksi!",
      description: `${cleanBarcode} - Mencari data peserta...`,
      duration: 2000,
    })

    // FAST: Search participant dengan cache
    const participant = await searchParticipant(cleanBarcode, true)

    if (!participant) return

    // AUTO-ATTENDANCE: Immediate UI update dengan optimistic update
    if (autoAttendanceEnabled) {
      await fastAttendanceUpdate(participant)
    }

  }, [searchParticipant, fastAttendanceUpdate, autoAttendanceEnabled, toast])

  // OPTIMIZED: Fast file upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadLoading(true)
    setUploadResult(null)

    try {
      // Show immediate feedback
      toast({
        title: "📸 Memproses Gambar...",
        description: "Mendeteksi QR Code atau Barcode",
        duration: 2000,
      })

      const result = await processBarcodeImage(file)
      setUploadResult(result)

      if (result.success && result.barcode) {
        const cleanBarcode = result.barcode.trim()
        
        // INSTANT UI UPDATE
        setScannedCode(cleanBarcode)

        const codeTypeText = result.codeType === "qr" ? "QR Code" : "Barcode"
        toast({
          title: `✅ ${codeTypeText} Terdeteksi!`,
          description: `${cleanBarcode} - Mencari data peserta...`,
          duration: 2000,
        })

        // FAST: Search and auto-attendance
        const participant = await searchParticipant(cleanBarcode, true)
        
        if (autoAttendanceEnabled && participant) {
          await fastAttendanceUpdate(participant)
        }
      } else {
        toast({
          title: "❌ Kode Tidak Terdeteksi",
          description: result.error || "Tidak dapat membaca QR Code atau Barcode dari gambar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("File upload error:", error)
      toast({
        title: "Error",
        description: "Gagal memproses gambar kode",
        variant: "destructive",
      })
    } finally {
      setUploadLoading(false)
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [searchParticipant, fastAttendanceUpdate, autoAttendanceEnabled, toast])

  // OPTIMIZED: Manual attendance dengan optimistic update
  const markAttendance = useCallback(async (participantId: string, currentStatus: boolean) => {
    if (!foundParticipant) return

    // Optimistic update
    const newStatus = !currentStatus
    const optimisticParticipant = { 
      ...foundParticipant, 
      is_present: newStatus,
      attended_at: newStatus ? new Date().toISOString() : null
    }
    
    setFoundParticipant(optimisticParticipant)
    participantCache.current.set(foundParticipant.participant_number, optimisticParticipant)

    // Immediate feedback
    toast({
      title: "Update Cepat",
      description: `Kehadiran ${newStatus ? "dicatat" : "dibatalkan"} - Menyimpan ke database...`,
    })

    try {
      const { error } = await dbHelpers.updateAttendance(participantId, newStatus)

      if (error) throw error

      toast({
        title: "✅ Berhasil",
        description: `Kehadiran ${newStatus ? "dicatat" : "dibatalkan"} pada ${new Date().toLocaleString("id-ID")}`,
      })
    } catch (error) {
      // Rollback optimistic update
      setFoundParticipant(foundParticipant)
      participantCache.current.set(foundParticipant.participant_number, foundParticipant)
      
      toast({
        title: "Error",
        description: "Gagal mengubah status kehadiran - perubahan dibatalkan",
        variant: "destructive",
      })
    }
  }, [foundParticipant, toast])

  const handleShowCodes = useCallback(() => {
    if (!foundParticipant) return
    setShowCodeModal(true)
  }, [foundParticipant])

  const clearUploadResult = useCallback(() => {
    setUploadResult(null)
  }, [])

  // OPTIMIZED: Fast scanner toggle
  const toggleScanner = useCallback(() => {
    if (isScanning) {
      setIsScanning(false)
      toast({
        title: "🛑 Scanner Dimatikan",
        description: "Kamera telah dinonaktifkan",
        duration: 2000,
      })
    } else {
      // Clear previous data for fresh start
      setFoundParticipant(null)
      setScannedCode("")
      setUploadResult(null)
      lastProcessedCode.current = ""
      
      setIsScanning(true)
      toast({
        title: "🎯 Scanner Aktif",
        description: "Kamera sedang diaktifkan untuk scanning",
        duration: 2000,
      })
    }
  }, [isScanning, toast])

  // OPTIMIZED: Memoized participant display untuk menghindari re-render
  const participantDisplay = useMemo(() => {
    if (!foundParticipant) {
      return (
        <div className="text-center py-8">
          <div className="flex justify-center items-center gap-2 mb-3">
            <QrCode className="h-12 w-12 text-gray-400" />
            <BarChart3 className="h-12 w-12 text-gray-400" />
          </div>
          <p className="text-gray-500">Scan QR Code/Barcode atau masukkan kode peserta</p>
          <p className="text-sm text-gray-400 mt-1">Hasil akan muncul di sini dengan cepat</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 transition-all duration-200">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nomor Peserta</p>
              <p className="font-semibold text-lg">{foundParticipant.participant_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Nama</p>
              <p className="font-semibold">{foundParticipant.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Kampus</p>
              <p className="font-semibold">{foundParticipant.campus}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status Kehadiran</p>
              <Badge 
                variant={foundParticipant.is_present ? "default" : "secondary"}
                className={foundParticipant.is_present ? "bg-green-100 text-green-800" : ""}
              >
                {foundParticipant.is_present ? "✅ Sudah Hadir" : "❌ Belum Hadir"}
              </Badge>
            </div>
            {foundParticipant.attended_at && (
              <div>
                <p className="text-sm text-gray-500">Waktu Hadir</p>
                <p className="font-semibold">
                  {new Date(foundParticipant.attended_at).toLocaleString("id-ID")}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => markAttendance(foundParticipant.id, foundParticipant.is_present)}
            variant={foundParticipant.is_present ? "destructive" : "default"}
            className={foundParticipant.is_present ? "" : "bg-blue-600 hover:bg-blue-700 text-white"}
            size="default"
          >
            {foundParticipant.is_present ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Batalkan Kehadiran
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Tandai Hadir
              </>
            )}
          </Button>
          
          <Button onClick={handleShowCodes} variant="outline" className="bg-transparent">
            <QrCode className="h-4 w-4 mr-2" />
            Lihat QR & Barcode
          </Button>
          
          <Button
            onClick={() => {
              setFoundParticipant(null)
              setScannedCode("")
              lastProcessedCode.current = ""
            }}
            variant="outline"
          >
            Reset
          </Button>
        </div>
      </div>
    )
  }, [foundParticipant, markAttendance, handleShowCodes])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Scanner Absensi</h1>
        <p className="text-gray-600">Scan QR Code atau Barcode peserta untuk absensi real-time</p>
      </div>

      {/* Upload Result Display */}
      {uploadResult && (
        <Card
          className={`shadow-md border-2 transition-all duration-300 ${
            uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {uploadResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium ${uploadResult.success ? "text-green-900" : "text-red-900"}`}>
                  {uploadResult.success ? (
                    <div className="flex items-center gap-2">
                      {uploadResult.codeType === "qr" ? (
                        <QrCode className="h-4 w-4" />
                      ) : (
                        <BarChart3 className="h-4 w-4" />
                      )}
                      <span>
                        {uploadResult.codeType === "qr" ? "QR Code" : "Barcode"} Terdeteksi: {uploadResult.barcode}
                      </span>
                    </div>
                  ) : (
                    "QR Code atau Barcode Tidak Terdeteksi"
                  )}
                </h4>
                {uploadResult.error && <p className="text-sm text-red-700 mt-1">{uploadResult.error}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={clearUploadResult}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Attendance Toggle - Optimized */}
      <Card className="shadow-md border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Auto-Attendance</h4>
              <p className="text-sm text-gray-600">Instant absensi ketika QR Code atau Barcode terdeteksi</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={autoAttendanceEnabled}
                onCheckedChange={setAutoAttendanceEnabled}
                className="data-[state=checked]:bg-green-600"
              />
              <Badge
                variant={autoAttendanceEnabled ? "default" : "secondary"}
                className={autoAttendanceEnabled ? "bg-green-100 text-green-800" : ""}
              >
                {autoAttendanceEnabled ? "ON" : "OFF"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Scanner Section - Optimized */}
        <div className="space-y-6">
          <Card className="shadow-md border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-700">
                <Camera className="h-5 w-5" />
                Real-time Scanner
              </CardTitle>
              <CardDescription className="text-gray-500">
                Scanner super cepat dengan deteksi instant
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Scanner Control */}
                <div className="flex items-center justify-between">
                  <Button
                    onClick={toggleScanner}
                    className={`${
                      isScanning 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    } px-6 py-2 transition-all duration-200`}
                  >
                    {isScanning ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Stop Scanner
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Mulai Scanner
                      </>
                    )}
                  </Button>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2">
                    {isScanning && (
                      <Badge className="bg-green-100 text-green-800 px-3 py-1 animate-pulse">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping mr-2" />
                        Scanning Live
                      </Badge>
                    )}
                    {autoAttendanceEnabled && isScanning && (
                      <Badge className="bg-blue-100 text-blue-800 px-2 py-1">
                        🎯 Auto ON
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Scanner Display - Optimized */}
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  {isScanning ? (
                    <div className="relative">
                      {/* Auto-attendance indicator overlay */}
                      {autoAttendanceEnabled && (
                        <div className="absolute top-3 left-3 right-3 z-10">
                        </div>
                      )}
                      
                      {/* Optimized Barcode Scanner */}
                      <BarcodeScanner
                        onBarcodeDetected={handleBarcodeDetected}
                        isScanning={isScanning}
                        onScanningChange={setIsScanning}
                      />
                      
                      {/* Enhanced Scanner Frame */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                          <div className="w-56 h-56 relative">
                            {/* Animated corner indicators */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-500 rounded-tl-lg animate-pulse"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-500 rounded-tr-lg animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-500 rounded-bl-lg animate-pulse"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-500 rounded-br-lg animate-pulse"></div>
                            
                            {/* Fast scanning line animation */}
                            <div className="absolute inset-x-6 top-1/2 h-1 bg-blue-500 animate-ping rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Instructions */}
                      <div className="absolute bottom-4 left-4 right-4 text-center text-white bg-black bg-opacity-70 rounded-lg p-3">
                        <p className="text-sm font-medium">Scanner Super Cepat Aktif</p>
                        <p className="text-xs mt-1 opacity-90">
                          Arahkan ke QR/Barcode → Instant hasil!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100">
                      <div className="text-center p-6">
                        <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Scanner Siap Digunakan</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Klik "Mulai Scanner" untuk aktivasi instant
                        </p>
                        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                          <p className="font-medium mb-1">Fitur Super Cepat:</p>
                          <p>• Instant detection & response</p>
                          <p>• Auto-attendance dalam milidetik</p>
                          <p>• Cache untuk performa maksimal</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Input & File Upload - Optimized */}
          <Card className="shadow-md">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-700">
                <div className="flex items-center gap-1">
                  <QrCode className="h-5 w-5" />
                  <BarChart3 className="h-5 w-5" />
                </div>
                Input Manual & Upload
              </CardTitle>
              <CardDescription className="text-gray-500">
                Alternatif cepat jika scanner kamera tidak berfungsi
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Fast File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="text-gray-700">
                  Upload Foto QR Code atau Barcode
                </Label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex-1 transition-all duration-200"
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        📸 Pilih Foto QR/Barcode
                      </>
                    )}
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <p className="text-xs text-gray-500">
                  Supported: JPG, PNG, GIF, WebP. Instant processing untuk deteksi cepat.
                </p>
              </div>

              {/* Fast Manual Input */}
              <div className="border-t pt-4">
                <Label htmlFor="manual-code" className="text-gray-700">
                  Atau Masukkan Kode Manual
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="manual-code"
                    placeholder="UI01, ITB01, UGM01..."
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        searchParticipant(scannedCode)
                      }
                    }}
                    className="transition-all duration-200"
                  />
                  <Button
                    onClick={() => searchParticipant(scannedCode)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Result Section - Optimized for Speed */}
        <Card className="shadow-md">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-700">
              <CheckCircle className="h-5 w-5" />
              Hasil Scan Real-time
            </CardTitle>
            <CardDescription className="text-gray-500">
              Informasi peserta dan status kehadiran - Update instant
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {participantDisplay}
          </CardContent>
        </Card>
      </div>

      {/* Code Display Modal */}
      {foundParticipant && (
        <CodeDisplayModal
          isOpen={showCodeModal}
          onClose={() => setShowCodeModal(false)}
          participantNumber={foundParticipant.participant_number}
          participantName={foundParticipant.name}
        />
      )}

    </div>
  )
}