"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { type Participant, dbHelpers } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Upload, QrCode, Search, CheckCircle, X, AlertCircle, BarChart3, Camera, Flashlight, ArrowLeft } from "lucide-react"
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

  const searchParticipant = async (code: string) => {
    if (!code.trim()) return null

    setLoading(true)
    try {
      const { data, error } = await dbHelpers.getParticipantByNumber(code)

      if (error || !data) {
        setFoundParticipant(null)
        toast({
          title: "Peserta Tidak Ditemukan",
          description: `Nomor peserta "${code}" tidak terdaftar`,
          variant: "destructive",
        })
        return null
      }

      setFoundParticipant(data)
      toast({
        title: "Peserta Ditemukan",
        description: `${data.name} - ${data.participant_number}`,
      })

      return data // Return participant data for auto-attendance
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mencari peserta",
        variant: "destructive",
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleBarcodeDetected = async (barcode: string) => {
    console.log("🔍 BARCODE DETECTED:", barcode)
    
    // Validate barcode format to ensure accuracy
    const cleanBarcode = barcode.trim()
    if (!cleanBarcode) {
      console.log("❌ Empty barcode detected, ignoring...")
      return
    }
    
    console.log("✅ Processing barcode:", cleanBarcode)
    setScannedCode(cleanBarcode)
    
    const participant = await searchParticipant(cleanBarcode)

    // Keep scanning active - DON'T stop automatically
    // User must manually stop scanner
    console.log("🔄 Scanner remains active - waiting for user to stop manually")

    toast({
      title: "🎯 Kode Terdeteksi!",
      description: `${cleanBarcode} - Scanner tetap aktif`,
      duration: 3000,
    })

    // AUTO-ATTENDANCE: Mark attendance automatically after successful detection
    if (autoAttendanceEnabled && participant && !participant.is_present) {
      try {
        console.log("🎯 AUTO-ATTENDANCE: Marking attendance for", participant.participant_number)

        const { error } = await dbHelpers.updateAttendance(participant.id, true)

        if (error) throw error

        toast({
          title: "✅ Auto-Attendance Success!",
          description: `${participant.name} telah ditandai HADIR secara otomatis`,
          duration: 4000,
        })

        // Refresh participant data to show updated status
        await searchParticipant(cleanBarcode)
      } catch (error) {
        console.error("Auto-attendance error:", error)
        toast({
          title: "Auto-Attendance Error",
          description: "Kode terdeteksi tapi gagal update kehadiran. Silakan klik tombol manual.",
          variant: "destructive",
        })
      }
    } else if (autoAttendanceEnabled && participant && participant.is_present) {
      toast({
        title: "ℹ️ Already Present",
        description: `${participant.name} sudah tercatat hadir sebelumnya`,
        duration: 3000,
      })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log("🔍 FILE UPLOAD: Starting code image processing...")

    setUploadLoading(true)
    setUploadResult(null)

    try {
      // Process the uploaded image
      const result = await processBarcodeImage(file)

      console.log("🔍 FILE UPLOAD: Processing result:", result)
      setUploadResult(result)

      if (result.success && result.barcode) {
        // Set the detected code and search for participant
        setScannedCode(result.barcode)
        const participant = await searchParticipant(result.barcode)

        const codeTypeText = result.codeType === "qr" ? "QR Code" : "Barcode"
        toast({
          title: `${codeTypeText} Terdeteksi dari File`,
          description: `Nomor peserta: ${result.barcode}`,
        })

        // AUTO-ATTENDANCE: Mark attendance automatically after successful detection
        if (autoAttendanceEnabled && participant && !participant.is_present) {
          try {
            console.log("🎯 AUTO-ATTENDANCE: Marking attendance for", participant.participant_number)

            const { error } = await dbHelpers.updateAttendance(participant.id, true)

            if (error) throw error

            toast({
              title: "✅ Auto-Attendance Success!",
              description: `${participant.name} telah ditandai HADIR secara otomatis`,
            })

            // Refresh participant data to show updated status
            await searchParticipant(result.barcode)
          } catch (error) {
            console.error("Auto-attendance error:", error)
            toast({
              title: "Auto-Attendance Error",
              description: "Kode terdeteksi tapi gagal update kehadiran. Silakan klik tombol manual.",
              variant: "destructive",
            })
          }
        } else if (autoAttendanceEnabled && participant && participant.is_present) {
          toast({
            title: "ℹ️ Already Present",
            description: `${participant.name} sudah tercatat hadir sebelumnya`,
          })
        }
      } else {
        toast({
          title: "Kode Tidak Terdeteksi",
          description: result.error || "Tidak dapat membaca QR Code atau Barcode dari gambar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("🔍 FILE UPLOAD: Error processing image:", error)

      setUploadResult({
        success: false,
        error: `Error processing image: ${error}`,
        debugInfo: [`❌ Processing failed: ${error}`],
      })

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
  }

  const markAttendance = async (participantId: string, currentStatus: boolean) => {
    try {
      const { error } = await dbHelpers.updateAttendance(participantId, !currentStatus)

      if (error) throw error

      const currentTime = new Date().toISOString()
      toast({
        title: "Berhasil",
        description: `Kehadiran ${!currentStatus ? "dicatat" : "dibatalkan"} pada ${new Date(currentTime).toLocaleString("id-ID")}`,
      })

      // Refresh participant data
      searchParticipant(foundParticipant?.participant_number || "")
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengubah status kehadiran",
        variant: "destructive",
      })
    }
  }

  const handleShowCodes = () => {
    if (!foundParticipant) return
    setShowCodeModal(true)
  }

  const clearUploadResult = () => {
    setUploadResult(null)
  }

  const startScanning = () => {
    console.log("🎯 STARTING SCANNER: Activating camera and scanning...")
    setIsScanning(true)
    setFoundParticipant(null)
    setScannedCode("")
    setUploadResult(null)
    
    toast({
      title: "Scanner Aktif",
      description: "Kamera sedang diaktifkan, arahkan ke QR Code atau Barcode",
    })
  }

  const stopScanning = () => {
    console.log("🛑 STOPPING SCANNER: Deactivating camera...")
    setIsScanning(false)
    
    toast({
      title: "Scanner Dimatikan",
      description: "Kamera telah dimatikan",
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Scanner Absensi</h1>
        <p className="text-gray-600">Scan QR Code atau Barcode peserta untuk absensi</p>
      </div>

      {/* Upload Result Display */}
      {uploadResult && (
        <Card
          className={`shadow-md border-2 ${uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
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
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Attendance Toggle */}
      <Card className="shadow-md border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Auto-Attendance</h4>
              <p className="text-sm text-gray-600">Otomatis tandai hadir setelah QR Code atau Barcode terdeteksi</p>
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
        {/* Scanner Section */}
        <div className="space-y-6">
          {/* Camera Scanner */}
          <Card className="shadow-md border-blue-200">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-700">
                <Camera className="h-5 w-5" />
                Camera Scanner
              </CardTitle>
              <CardDescription className="text-gray-500">
                Gunakan kamera untuk scan QR Code atau Barcode secara real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Scanner Controls */}
                <div className="flex gap-2">
                  <Button
                    onClick={startScanning}
                    disabled={isScanning}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-green-600 disabled:cursor-not-allowed"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {isScanning ? "🟢 Scanner Aktif - Sedang Memindai..." : "Mulai Scanner"}
                  </Button>
                  {isScanning && (
                    <Button onClick={stopScanning} variant="destructive" className="bg-red-600 hover:bg-red-700">
                      <X className="h-4 w-4 mr-2" />
                      Stop Scanner
                    </Button>
                  )}
                </div>

                {/* Scanner Display */}
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  {isScanning ? (
                    <div className="relative">
                      {/* Auto-attendance indicator */}
                      {autoAttendanceEnabled && (
                        <div className="absolute top-2 left-2 right-2 z-10">
                          <div className="bg-green-500 bg-opacity-90 backdrop-blur-sm rounded-lg p-2 text-white text-center text-xs">
                            <p className="font-medium">✅ Auto-Attendance Aktif</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Barcode Scanner Component with explicit props */}
                      <BarcodeScanner
                        onBarcodeDetected={handleBarcodeDetected}
                        isScanning={isScanning}
                        onScanningChange={setIsScanning}
                      />
                      
                      {/* Scanner Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                          {/* Scanner Frame */}
                          <div className="w-48 h-48 sm:w-64 sm:h-64 relative">
                            {/* Corner indicators */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-l-3 border-t-3 border-white rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-r-3 border-t-3 border-white rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-3 border-b-3 border-white rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-3 border-b-3 border-white rounded-br-lg"></div>
                            
                            {/* Scanning line animation */}
                            <div className="absolute inset-x-4 top-1/2 h-0.5 bg-red-500 animate-pulse"></div>
                          </div>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="absolute bottom-4 left-4 right-4 text-center text-white bg-black bg-opacity-50 rounded-lg p-2">
                        <p className="text-sm font-medium">📱 Arahkan kamera ke QR Code atau Barcode</p>
                        <p className="text-xs mt-1 opacity-90">
                          Scanner akan terus aktif hingga Anda klik "Stop Scanner"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video flex items-center justify-center text-gray-500 bg-gray-100">
                      <div className="text-center">
                        <Camera className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm font-medium mb-1">Scanner Siap Digunakan</p>
                        <p className="text-xs text-gray-400">
                          Klik "Mulai Scanner" untuk langsung aktifkan kamera
                        </p>
                        <div className="mt-3 text-xs text-blue-600">
                          <p>✅ Mendukung QR Code & Barcode</p>
                          <p>✅ Auto-detection UNPAD01, ITB01, UI01, dll</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Input & File Upload */}
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
                Alternatif jika scanner kamera tidak berfungsi
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="text-gray-700">
                  Upload Foto QR Code atau Barcode
                </Label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex-1"
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
                        Pilih Foto QR/Barcode
                      </>
                    )}
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <p className="text-xs text-gray-500">
                  Supported: JPG, PNG, GIF, WebP. Pastikan QR Code atau Barcode terlihat jelas.
                </p>
              </div>

              {/* Manual Input */}
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
                  />
                  <Button
                    onClick={() => searchParticipant(scannedCode)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Result Section */}
        <Card className="shadow-md">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-700">
              <CheckCircle className="h-5 w-5" />
              Hasil Scan
            </CardTitle>
            <CardDescription className="text-gray-500">Informasi peserta dan status kehadiran</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {foundParticipant ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
                      <Badge variant={foundParticipant.is_present ? "default" : "secondary"}>
                        {foundParticipant.is_present ? "Sudah Hadir" : "Belum Hadir"}
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
                    }}
                    variant="outline"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex justify-center items-center gap-2 mb-3">
                  <QrCode className="h-12 w-12 text-gray-400" />
                  <BarChart3 className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-gray-500">Scan QR Code/Barcode atau masukkan kode peserta</p>
                <p className="text-sm text-gray-400 mt-1">Hasil akan muncul di sini</p>
              </div>
            )}
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