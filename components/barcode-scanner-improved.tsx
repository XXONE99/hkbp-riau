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
  const [isStartingCamera, setIsStartingCamera] = useState(false)
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

  // Monitor video element state
  useEffect(() => {
    if (videoRef.current) {
      console.log("📹 Video element found, readyState:", videoRef.current.readyState)
      console.log("📹 Video srcObject:", videoRef.current.srcObject)
    }
  }, [cameraActive])

  // Debug camera state changes
  useEffect(() => {
    console.log("📹 Camera state changed:", { cameraActive, hasCamera, error })
  }, [cameraActive, hasCamera, error])

  const checkCameraAvailability = async () => {
    try {
      console.log("🔍 Checking camera availability...")
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("❌ getUserMedia not supported")
        setHasCamera(false)
        setError("Browser tidak mendukung akses kamera")
        return
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      
      console.log("📹 Found video devices:", videoDevices.length)
      setHasCamera(videoDevices.length > 0)
      
      if (videoDevices.length === 0) {
        setError("Tidak ada kamera yang terdeteksi")
      }
    } catch (error) {
      console.error("❌ Error checking camera availability:", error)
      setHasCamera(false)
      setError("Gagal mendeteksi kamera")
    }
  }

  const startCamera = async () => {
    if (isStartingCamera) return
    
    setIsStartingCamera(true)
    setError(null)
    setLastDetectedCode(null)
    setLastCodeType(null)
    setDetectionResults([])
    setScanCount(0)

    try {
      console.log("🎥 Starting camera...")

      // Try different camera constraints
      const constraints = {
        video: {
          facingMode: "environment", // Prefer back camera
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 10 },
        },
      }

      console.log("📹 Requesting camera access with constraints:", constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      console.log("✅ Camera stream obtained:", stream)
      console.log("📹 Stream tracks:", stream.getTracks().map(track => ({ kind: track.kind, enabled: track.enabled })))

      if (videoRef.current) {
        console.log("📹 Setting video srcObject...")
        videoRef.current.srcObject = stream
        streamRef.current = stream

        // Add event listeners for debugging
        videoRef.current.onloadedmetadata = () => {
          console.log("📹 Video metadata loaded")
          if (videoRef.current) {
            console.log("📹 Video dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight)
            console.log("📹 Video readyState:", videoRef.current.readyState)
            
            videoRef.current.play().then(() => {
              console.log("▶️ Video started playing")
              setCameraActive(true)
              onScanningChange(true) // Auto-start scanning when camera is ready
              
              toast({
                title: "Kamera Aktif",
                description: "Scanner siap mendeteksi QR Code dan Barcode",
              })
            }).catch((playError) => {
              console.error("❌ Error playing video:", playError)
              setError("Gagal memulai video kamera")
              stopCamera()
            })
          }
        }

        videoRef.current.oncanplay = () => {
          console.log("▶️ Video can play")
        }

        videoRef.current.oncanplaythrough = () => {
          console.log("▶️ Video can play through")
        }

        videoRef.current.onerror = (error) => {
          console.error("❌ Video error:", error)
          setError("Error pada video kamera")
          stopCamera()
        }

        // Force video to load
        videoRef.current.load()
      } else {
        console.error("❌ Video ref not available")
        setError("Element video tidak tersedia")
        stopCamera()
      }
    } catch (error) {
      console.error("❌ Camera access error:", error)
      
      let errorMessage = "Gagal mengakses kamera"
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Izin kamera ditolak. Silakan berikan izin kamera di browser."
        } else if (error.name === 'NotFoundError') {
          errorMessage = "Tidak ada kamera yang ditemukan."
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Kamera sedang digunakan aplikasi lain."
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = "Kamera tidak mendukung resolusi yang diminta."
        } else {
          errorMessage = `Error kamera: ${error.message}`
        }
      }
      
      setError(errorMessage)
      setCameraActive(false)
      onScanningChange(false)
      
      toast({
        title: "Error Kamera",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsStartingCamera(false)
    }
  }

  const stopCamera = () => {
    console.log("🛑 Stopping camera...")
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log("🛑 Stopping track:", track.kind)
        track.stop()
      })
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
    console.log("🔍 Started code detection")
  }

  const stopCodeDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
      console.log("🛑 Stopped code detection")
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
            <Button 
              onClick={startCamera} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isStartingCamera}
            >
              {isStartingCamera ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Memulai Kamera...
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Aktifkan Kamera
                </>
              )}
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
              className="w-full h-64 object-cover rounded-lg border-2 border-gray-200 bg-gray-100"
              style={{
                filter: lastDetectedCode ? "brightness(1.2) contrast(1.1)" : "none",
              }}
              onLoadedMetadata={() => {
                console.log("📹 Video metadata loaded successfully")
                if (videoRef.current) {
                  console.log("📹 Video dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight)
                }
              }}
              onCanPlay={() => {
                console.log("▶️ Video can play")
              }}
              onError={(e) => {
                console.error("❌ Video error:", e)
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Fallback content if video doesn't load */}
            {videoRef.current && videoRef.current.readyState < 2 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Memuat kamera...</p>
                </div>
              </div>
            )}
            
            {/* Video status indicator */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
              {videoRef.current ? (
                videoRef.current.readyState >= 2 ? "Video Ready" : "Loading Video..."
              ) : (
                "No Video Element"
              )}
            </div>
            
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

        {/* Camera not active state */}
        {!cameraActive && (
          <div className="w-full h-64 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Kamera belum aktif</p>
              <p className="text-sm text-gray-500">Klik "Aktifkan Kamera" untuk memulai</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
            <Button 
              onClick={startCamera} 
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white" 
              size="sm"
              disabled={isStartingCamera}
            >
              Coba Lagi
            </Button>
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
