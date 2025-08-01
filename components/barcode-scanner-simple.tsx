"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Camera, Scan, AlertCircle, CheckCircle, Power, PowerOff } from "lucide-react"
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
  const animationFrameRef = useRef<number | null>(null)

  const [hasCamera, setHasCamera] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [scanCount, setScanCount] = useState<number>(0)
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [detectionRate, setDetectionRate] = useState<number>(0)

  const { toast } = useToast()

  // OPTIMIZED: Detection cache untuk menghindari duplicate processing
  const detectionCache = useRef<Map<string, number>>(new Map())
  const lastDetectionTime = useRef<number>(0)

  useEffect(() => {
    checkCameraAvailability()
  }, [])

  useEffect(() => {
    if (isScanning && cameraActive) {
      startFastBarcodeDetection()
    } else {
      stopBarcodeDetection()
    }

    return () => {
      stopBarcodeDetection()
    }
  }, [isScanning, cameraActive])

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setHasCamera(videoDevices.length > 0)
    } catch {
      setHasCamera(false)
    }
  }

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      setLastDetectedBarcode(null)
      detectionCache.current.clear()

      // OPTIMIZED: High-performance camera constraints
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 60, min: 30 }, // Higher frame rate untuk deteksi lebih cepat
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraActive(true)
            onScanningChange(true)
            
            toast({
              title: "🚀 Kamera Super Cepat Aktif",
              description: "Scanner siap dengan deteksi real-time",
              duration: 2000,
            })
          })
        }
      }
    } catch {
      setError("Gagal membuka kamera. Pastikan izin kamera diberikan.")
      toast({
        title: "Gagal membuka kamera",
        description: "Periksa izin kamera browser Anda.",
        variant: "destructive",
      })
    }
  }, [onScanningChange, toast])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    stopBarcodeDetection()
    setCameraActive(false)
    onScanningChange(false)
    setScanCount(0)
    setLastDetectedBarcode(null)
    setDebugInfo([])
    detectionCache.current.clear()

    toast({
      title: "Kamera Dimatikan",
      description: "Scanner dihentikan",
      duration: 2000,
    })
  }, [onScanningChange, toast])

  // OPTIMIZED: Ultra-fast detection using requestAnimationFrame
  const startFastBarcodeDetection = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)

    let frameCount = 0
    const startTime = Date.now()

    const detectFrame = () => {
      if (!isScanning || !cameraActive) return

      frameCount++
      const currentTime = Date.now()
      
      // Update detection rate setiap detik
      if (currentTime - startTime >= 1000) {
        setDetectionRate(frameCount)
        frameCount = 0
      }

      // FAST: Detect barcode setiap frame
      detectBarcodeOptimized()
      
      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(detectFrame)
    }

    // Start frame-based detection
    animationFrameRef.current = requestAnimationFrame(detectFrame)

    console.log("🚀 Started ULTRA-FAST frame-based detection")
  }, [isScanning, cameraActive])

  const stopBarcodeDetection = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  // OPTIMIZED: Ultra-fast barcode detection
  const detectBarcodeOptimized = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    setScanCount((prev) => prev + 1)

    // OPTIMIZED: Reduced canvas size untuk performa lebih baik
    const scale = 0.5 // Process at 50% resolution untuk speed
    canvas.width = video.videoWidth * scale
    canvas.height = video.videoHeight * scale
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // FAST: QR Code detection pertama (paling reliable)
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert", // Skip inversion untuk speed
    })
    
    if (qrCode && qrCode.data) {
      const validatedCode = validateParticipantCode(qrCode.data.trim())
      if (validatedCode && validatedCode !== lastDetectedBarcode) {
        handleFastDetection(validatedCode, "QR Code")
        return
      }
    }

    // FAST: Barcode detection jika QR tidak ada
    const detectedBarcode = scanForBarcodePattern(imageData)
    if (detectedBarcode && detectedBarcode !== lastDetectedBarcode) {
      handleFastDetection(detectedBarcode, "Barcode")
    }
  }, [lastDetectedBarcode])

  // OPTIMIZED: Fast detection handler dengan immediate response
  const handleFastDetection = useCallback((code: string, type: string) => {
    const currentTime = Date.now()
    
    // DEBOUNCE: Skip jika detection terlalu cepat berurutan
    if (currentTime - lastDetectionTime.current < 500) {
      return
    }
    
    lastDetectionTime.current = currentTime
    setLastDetectedBarcode(code)

    // IMMEDIATE: Update debug info
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] 🎯 ${type.toUpperCase()} DETECTED: ${code}`
    setDebugInfo((prev) => [logMessage, ...prev.slice(0, 4)]) // Keep only last 5, newest first

    // IMMEDIATE: Trigger callback - ini yang paling penting untuk speed
    onBarcodeDetected(code)
    
    // IMMEDIATE: Visual feedback
    flashScanEffect()

    toast({
      title: `${type} Terdeteksi!`,
      description: `${code} - Processing instant...`,
      duration: 1500,
    })

    // Reset detection setelah 1.5 detik untuk allow scanning code berikutnya
    setTimeout(() => {
      setLastDetectedBarcode(null)
    }, 1500)
  }, [onBarcodeDetected, toast])

  // OPTIMIZED: Faster participant code validation
  const validateParticipantCode = useCallback((code: string): string | null => {
    // FAST: Pre-compiled regex untuk speed
    const validPatterns = [
      /^UI\d{2}$/i,
      /^ITB\d{2}$/i,
      /^UGM\d{2}$/i,
      /^UNPAD\d{2}$/i,
      /^ITS\d{2}$/i,
      /^UNAIR\d{2}$/i,
      /^UB\d{2}$/i,
      /^UNDIP\d{2}$/i,
      /^UNHAS\d{2}$/i,
      /^UNS\d{2}$/i,
      /^UNRI\d{2}$/i,
      /^UNCEN\d{2}$/i,
    ]

    const upperCode = code.toUpperCase()
    
    // FAST: Early return on match
    for (const regex of validPatterns) {
      if (regex.test(upperCode)) {
        return upperCode
      }
    }

    return null
  }, [])

  // OPTIMIZED: Faster barcode pattern scanning
  const scanForBarcodePattern = useCallback((imageData: ImageData): string | null => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    // FAST: Focus only on text area (bottom 40%)
    const textStartY = Math.floor(height * 0.65)
    const textEndY = Math.floor(height * 0.95)

    // FAST: Scan fewer lines untuk speed
    for (let y = textStartY; y < textEndY; y += 3) { // Skip more lines
      const result = scanLineForTextFast(data, width, height, y)
      if (result) {
        return result
      }
    }

    return null
  }, [])

  // OPTIMIZED: Faster line scanning
  const scanLineForTextFast = useCallback((
    data: Uint8ClampedArray,
    width: number,
    height: number,
    y: number
  ): string | null => {
    let binaryPattern = ""
    const threshold = 128

    // FAST: Process every 2nd pixel untuk speed
    for (let x = 0; x < width; x += 2) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      binaryPattern += gray < threshold ? "1" : "0"
    }

    return extractParticipantFromBinaryFast(binaryPattern)
  }, [])

  // OPTIMIZED: Faster pattern extraction
  const extractParticipantFromBinaryFast = useCallback((pattern: string): string | null => {
    // FAST: Only try most common chunk sizes
    const chunkSizes = [8, 7] // Reduced from 4 sizes to 2
    
    for (const chunkSize of chunkSizes) {
      let text = ""
      
      // FAST: Process in larger steps
      for (let i = 0; i <= pattern.length - chunkSize; i += chunkSize) {
        const chunk = pattern.substring(i, i + chunkSize)
        if (chunk.length === chunkSize) {
          const charCode = parseInt(chunk, 2)
          
          if (charCode >= 32 && charCode <= 126) {
            text += String.fromCharCode(charCode)
          }
        }
      }

      // FAST: Quick pattern matching
      const match = text.match(/(?:UI|ITB|UGM|UNPAD|ITS|UNAIR|UB|UNDIP|UNHAS|UNS|UNRI|UNCEN)\d{2}/gi)
      if (match) {
        return match[0].toUpperCase()
      }
    }

    return null
  }, [])

  const flashScanEffect = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.style.filter = "brightness(1.3) contrast(1.1)"
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.style.filter = "none"
        }
      }, 150) // Faster flash
    }
  }, [])

  const clearDetectionLog = useCallback(() => {
    setDebugInfo([])
    setScanCount(0)
    setLastDetectedBarcode(null)
    detectionCache.current.clear()
  }, [])

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
    <div className="space-y-4">
      {/* Fast Camera Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!cameraActive ? (
            <Button 
              onClick={startCamera} 
              className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
              size="sm"
            >
              <Camera className="w-4 h-4 mr-1" />
              🚀 Buka Kamera
            </Button>
          ) : (
            <Button onClick={stopCamera} variant="destructive" size="sm">
              <PowerOff className="w-4 h-4 mr-1" />
              Tutup Kamera
            </Button>
          )}
        </div>

        {/* Real-time Status Badges */}
        <div className="flex items-center gap-2">
          {cameraActive && isScanning && (
            <Badge className="bg-green-100 text-green-800 animate-pulse">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping mr-1" />
              Live: {detectionRate}/sec
            </Badge>
          )}
          {lastDetectedBarcode && (
            <Badge className="bg-blue-100 text-blue-800 animate-in slide-in-from-right">
              Last: {lastDetectedBarcode}
            </Badge>
          )}
          {cameraActive && (
            <Badge className="bg-blue-100 text-blue-800">
              <Power className="w-3 h-3 mr-1" />
              Scans: {scanCount}
            </Badge>
          )}
        </div>
      </div>

      {/* OPTIMIZED: Real-time Detection Results */}
      <div className="bg-gray-50 p-3 rounded border border-gray-200 transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Detection Log (Real-time)
          </h4>
          <Button onClick={clearDetectionLog} variant="ghost" size="sm" className="text-xs">
            Clear
          </Button>
        </div>
        <div className="space-y-1 text-xs font-mono max-h-24 overflow-y-auto">
          {debugInfo.length > 0 ? (
            debugInfo.map((log, i) => (
              <div 
                key={i} 
                className={`px-2 py-1 rounded transition-all duration-200 ${
                  i === 0 ? "bg-green-200 text-green-900 animate-in slide-in-from-top" : "bg-green-100 text-green-800"
                }`}
              >
                {log}
              </div>
            ))
          ) : (
            <p className="text-gray-500">Waiting for detection...</p>
          )}
        </div>
      </div>

      {/* OPTIMIZED: Video Display dengan visual feedback */}
      <div className="relative">
        <video
          ref={videoRef}
          className={`w-full h-64 bg-gray-100 rounded border-2 transition-all duration-200 ${
            cameraActive ? "block border-blue-300" : "hidden"
          } ${lastDetectedBarcode ? "ring-2 ring-green-400 ring-opacity-50" : ""}`}
          playsInline
          muted
        />
        {!cameraActive && (
          <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center flex-col text-gray-500 border-2 border-gray-200">
            <Camera className="w-10 h-10 mb-2" />
            <p className="font-medium">Kamera belum aktif</p>
            <p className="text-xs text-gray-400">Klik "Buka Kamera" untuk mulai scanning super cepat</p>
          </div>
        )}

        {/* Enhanced Scanning Overlay */}
        {cameraActive && isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              <div className="w-48 h-48 relative">
                {/* Animated scanning frame */}
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg animate-pulse"></div>
                <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-green-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-green-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-green-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-green-500 rounded-br-lg"></div>
                
                {/* Fast scanning line */}
                <div className="absolute inset-x-4 top-1/2 h-0.5 bg-green-500 animate-ping rounded-full"></div>
                
                {/* Detection indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    {detectionRate > 0 ? `${detectionRate} FPS` : "Scanning..."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

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
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Performance Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <Scan className="h-4 w-4" />
          Scanner Super Cepat
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Deteksi real-time dengan frame-based processing</p>
          <p>• Auto-attendance instant tanpa delay</p>
          <p>• Cache system untuk performa maksimal</p>
          <p>• Support: UI01, ITB01, UGM01, UNPAD01, dst</p>
        </div>
        
        {cameraActive && (
          <div className="mt-2 pt-2 border-t border-blue-200">
            <p className="text-xs text-blue-600">
              Status: {scanCount} total scans, {detectionRate} detections/sec
            </p>
          </div>
        )}
      </div>
    </div>
  )
}