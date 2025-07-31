"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Camera, Scan, AlertCircle, CheckCircle, Power, PowerOff, QrCode, BarChart3 } from "lucide-react"
import { processBarcodeImage } from "@/lib/barcode-image-processor"
import jsQR from 'jsqr'

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void
  isScanning: boolean
  onScanningChange: (scanning: boolean) => void
}

export function BarcodeScanner({ onBarcodeDetected, isScanning, onScanningChange }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectionResults, setDetectionResults] = useState<string[]>([])
  const [scanCount, setScanCount] = useState<number>(0)
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null)
  const [lastCodeType, setLastCodeType] = useState<"qr" | "barcode" | null>(null)
  const { toast } = useToast()

  // Check camera availability
  useEffect(() => {
    checkCameraAvailability()
  }, [])

  // Handle scanning state changes
  useEffect(() => {
    if (isScanning && cameraActive) {
      startCodeDetection()
    } else {
      stopCodeDetection()
    }

    return () => {
      stopCodeDetection()
    }
  }, [isScanning, cameraActive])

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setHasCamera(videoDevices.length > 0)
    } catch (error) {
      setHasCamera(false)
    }
  }

  const startCamera = async () => {
    try {
      setError(null)
      setLastDetectedCode(null)
      setLastCodeType(null)
      setDetectionResults([])
      setScanCount(0)

      // Request camera access with high resolution
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 15 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream

        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setCameraActive(true)
              onScanningChange(true) // Auto-start scanning when camera is ready
            })
          }
        }
      }

      toast({
        title: "Kamera Aktif",
        description: "Scanner siap mendeteksi QR Code dan Barcode",
      })
    } catch (error) {
      setError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.")
      setCameraActive(false)
      onScanningChange(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
    onScanningChange(false)
    setError(null)
    setLastDetectedCode(null)
    setLastCodeType(null)

    toast({
      title: "Kamera Dinonaktifkan",
      description: "Scanner telah dihentikan",
    })
  }

  const startCodeDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    // Scan every 200ms for better performance
    scanIntervalRef.current = setInterval(detectCodeFromCamera, 200)
  }

  const stopCodeDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  const detectCodeFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return
    }

    setScanCount((prev) => prev + 1)

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (canvas.width === 0 || canvas.height === 0) {
        return
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get image data for jsQR detection
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Try QR code detection first using jsQR
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })

      if (qrCode && qrCode.data !== lastDetectedCode) {
        const timestamp = new Date().toLocaleTimeString()
        const logMessage = `[${timestamp}] 🎯 QR CODE DETECTED: ${qrCode.data}`

        console.log("🔍 CAMERA SCANNER:", logMessage)
        setDetectionResults((prev) => [...prev.slice(-4), logMessage])

        setLastDetectedCode(qrCode.data)
        setLastCodeType("qr")
        onBarcodeDetected(qrCode.data)
        flashScanEffect()

        toast({
          title: "QR Code Terdeteksi!",
          description: `Nomor peserta: ${qrCode.data}`,
          duration: 2000,
        })

        // Reset after 3 seconds to allow scanning next code
        setTimeout(() => {
          setLastDetectedCode(null)
          setLastCodeType(null)
        }, 3000)

        return
      }

      // Try inverted QR code detection
      const invertedQrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      })

      if (invertedQrCode && invertedQrCode.data !== lastDetectedCode) {
        const timestamp = new Date().toLocaleTimeString()
        const logMessage = `[${timestamp}] 🎯 QR CODE DETECTED (INVERTED): ${invertedQrCode.data}`

        console.log("🔍 CAMERA SCANNER:", logMessage)
        setDetectionResults((prev) => [...prev.slice(-4), logMessage])

        setLastDetectedCode(invertedQrCode.data)
        setLastCodeType("qr")
        onBarcodeDetected(invertedQrCode.data)
        flashScanEffect()

        toast({
          title: "QR Code Terdeteksi!",
          description: `Nomor peserta: ${invertedQrCode.data}`,
          duration: 2000,
        })

        // Reset after 3 seconds to allow scanning next code
        setTimeout(() => {
          setLastDetectedCode(null)
          setLastCodeType(null)
        }, 3000)

        return
      }

      // If no QR code found, try barcode detection using the improved processor
      // Convert canvas to blob and then to file for processing
      canvas.toBlob(
        async (blob) => {
          if (!blob) return

          // Create a File object from the blob
          const file = new File([blob], "camera-frame.png", { type: "image/png" })

          // Use the same processing function as file upload
          const result = await processBarcodeImage(file)

          if (result.success && result.barcode && result.barcode !== lastDetectedCode) {
            const timestamp = new Date().toLocaleTimeString()
            const codeTypeText = result.codeType === "qr" ? "QR Code" : "Barcode"
            const logMessage = `[${timestamp}] 🎯 ${codeTypeText.toUpperCase()} DETECTED: ${result.barcode}`

            console.log("🔍 CAMERA SCANNER:", logMessage)
            setDetectionResults((prev) => [...prev.slice(-4), logMessage]) // Keep only last 5 results

            setLastDetectedCode(result.barcode)
            setLastCodeType(result.codeType || "barcode")
            onBarcodeDetected(result.barcode)
            flashScanEffect()

            toast({
              title: `${codeTypeText} Terdeteksi!`,
              description: `Nomor peserta: ${result.barcode}`,
              duration: 2000,
            })

            // Reset after 3 seconds to allow scanning next code
            setTimeout(() => {
              setLastDetectedCode(null)
              setLastCodeType(null)
            }, 3000)
          }
        },
        "image/png",
        0.8,
      )
    } catch (error) {
      console.error("Detection error:", error)
    }
  }

  const flashScanEffect = () => {
    if (videoRef.current) {
      videoRef.current.style.filter = "brightness(1.5) contrast(1.2) saturate(1.3)"
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.style.filter = "none"
        }
      }, 300)
    }
  }

  const clearDetectionLog = () => {
    setDetectionResults([])
    setScanCount(0)
    setLastDetectedCode(null)
    setLastCodeType(null)
  }

  if (!hasCamera) {
    return (
      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Camera className="h-5 w-5" />
            Kamera Tidak Tersedia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Perangkat ini tidak memiliki kamera atau kamera tidak dapat diakses.
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="h-4 w-4" />
            Gunakan fitur "Input Manual & Upload" sebagai alternatif
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <div className="flex items-center gap-1">
              <QrCode className="h-5 w-5" />
              <BarChart3 className="h-5 w-5" />
            </div>
            Real-time Code Scanner
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={cameraActive ? "default" : "secondary"} className="text-xs">
              {cameraActive ? "AKTIF" : "NONAKTIF"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {scanCount} scans
            </Badge>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Scanner kamera real-time untuk mendeteksi QR Code dan Barcode secara otomatis
        </p>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Camera Controls */}
        <div className="flex items-center gap-4">
          {!cameraActive ? (
            <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Power className="h-4 w-4 mr-2" />
              Aktifkan Kamera
            </Button>
          ) : (
            <Button onClick={stopCamera} variant="destructive">
              <PowerOff className="h-4 w-4 mr-2" />
              Nonaktifkan Kamera
            </Button>
          )}

          {cameraActive && (
            <Button
              onClick={() => onScanningChange(!isScanning)}
              variant={isScanning ? "destructive" : "default"}
              className={isScanning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isScanning ? (
                <>
                  <Scan className="h-4 w-4 mr-2" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4 mr-2" />
                  Start Scanning
                </>
              )}
            </Button>
          )}

          <Button onClick={clearDetectionLog} variant="outline" size="sm">
            Clear Log
          </Button>
        </div>

        {/* Camera Feed */}
        {cameraActive && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
              style={{
                filter: lastDetectedCode ? "brightness(1.2) contrast(1.1)" : "none",
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning Overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold">
                    <Scan className="h-5 w-5 animate-pulse" />
                    Scanning...
                  </div>
                </div>
              </div>
            )}

            {/* Detection Status */}
            {lastDetectedCode && (
              <div className="absolute top-2 right-2">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {lastCodeType === "qr" ? "QR" : "Barcode"}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Detection Results */}
        {detectionResults.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Detection Log:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {detectionResults.map((result, index) => (
                <div key={index} className="text-xs text-gray-700 font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Cara Penggunaan:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Aktifkan kamera dan mulai scanning</li>
            <li>• Arahkan kamera ke QR Code atau Barcode</li>
            <li>• Scanner akan mendeteksi secara otomatis</li>
            <li>• Hasil deteksi akan muncul di log</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
