"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Camera, Scan, AlertCircle, CheckCircle, Power, PowerOff } from "lucide-react"

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
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [scanCount, setScanCount] = useState<number>(0)
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const { toast } = useToast()

  // ONLY log barcode detection results
  const logBarcodeResult = (barcode: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] 🎯 BARCODE DETECTED: ${barcode}`
    console.log("🔍 BARCODE SCANNER:", logMessage)
    setDebugInfo((prev) => [...prev.slice(-4), logMessage]) // Keep only last 5 results
  }

  // Check camera availability
  useEffect(() => {
    checkCameraAvailability()
  }, [])

  // Auto-start camera when component mounts
  useEffect(() => {
    if (hasCamera && !cameraActive) {
      startCamera()
    }
  }, [hasCamera])

  // Handle scanning state changes
  useEffect(() => {
    if (isScanning && cameraActive) {
      startBarcodeDetection()
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
    } catch (error) {
      setHasCamera(false)
    }
  }

  const startCamera = async () => {
    try {
      setError(null)
      setLastDetectedBarcode(null)

      // Request camera access with high resolution for long distance scanning
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 }, // Higher resolution for distance
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
        description: "Scanner siap mendeteksi barcode dari jarak jauh",
      })
    } catch (error) {
      setError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.")
      setCameraActive(false)
      onScanningChange(false)

      toast({
        title: "Error Kamera",
        description: "Gagal mengakses kamera. Periksa izin kamera.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    // Stop barcode detection
    stopBarcodeDetection()

    // Reset states
    setCameraActive(false)
    onScanningChange(false)
    setError(null)
    setScanCount(0)
    setLastDetectedBarcode(null)
    setDebugInfo([])

    console.log("🔍 BARCODE SCANNER: ✅ Camera stopped")
  }

  const startBarcodeDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    // Scan every 200ms for faster detection
    scanIntervalRef.current = setInterval(() => {
      detectBarcode()
    }, 200)
  }

  const stopBarcodeDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  const detectBarcode = () => {
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

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    if (canvas.width === 0 || canvas.height === 0) {
      return
    }

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for barcode detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // FULL AREA SCAN - No coordinates, scan entire image
    const detectedBarcode = scanFullImageForBarcode(imageData)

    if (detectedBarcode && detectedBarcode !== lastDetectedBarcode) {
      // ONLY LOG SUCCESSFUL DETECTIONS
      logBarcodeResult(detectedBarcode)

      setLastDetectedBarcode(detectedBarcode)
      onBarcodeDetected(detectedBarcode)
      flashScanEffect()

      toast({
        title: "Barcode Terdeteksi!",
        description: `Nomor peserta: ${detectedBarcode}`,
        duration: 2000,
      })

      // Reset after 3 seconds to allow scanning next barcode
      setTimeout(() => {
        setLastDetectedBarcode(null)
      }, 3000)
    }
  }

  // FULL IMAGE SCAN - No coordinate restrictions
  const scanFullImageForBarcode = (imageData: ImageData): string | null => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    if (width === 0 || height === 0) {
      return null
    }

    // METHOD 1: Scan ENTIRE image horizontally (every 3 pixels for performance)
    for (let y = 0; y < height; y += 3) {
      const result = scanHorizontalLine(data, width, height, y)
      if (result) {
        return result
      }
    }

    // METHOD 2: Scan ENTIRE image vertically (every 5 pixels)
    for (let x = 0; x < width; x += 5) {
      const result = scanVerticalLine(data, width, height, x)
      if (result) {
        return result
      }
    }

    // METHOD 3: Scan diagonally
    const diagonalResult = scanDiagonally(data, width, height)
    if (diagonalResult) {
      return diagonalResult
    }

    return null
  }

  // Scan horizontal line across entire width
  const scanHorizontalLine = (data: Uint8ClampedArray, width: number, height: number, y: number): string | null => {
    if (y >= height) return null

    let binaryPattern = ""
    const threshold = 128

    // Scan entire width
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]

      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      binaryPattern += gray < threshold ? "0" : "1"
    }

    return extractParticipantFromPattern(binaryPattern)
  }

  // Scan vertical line across entire height
  const scanVerticalLine = (data: Uint8ClampedArray, width: number, height: number, x: number): string | null => {
    if (x >= width) return null

    let binaryPattern = ""
    const threshold = 128

    // Scan entire height
    for (let y = 0; y < height; y++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]

      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      binaryPattern += gray < threshold ? "0" : "1"
    }

    return extractParticipantFromPattern(binaryPattern)
  }

  // Scan diagonally
  const scanDiagonally = (data: Uint8ClampedArray, width: number, height: number): string | null => {
    let binaryPattern = ""
    const threshold = 128
    const steps = Math.min(width, height)

    for (let i = 0; i < steps; i++) {
      const x = Math.floor((i * width) / steps)
      const y = Math.floor((i * height) / steps)
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]

      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      binaryPattern += gray < threshold ? "0" : "1"
    }

    return extractParticipantFromPattern(binaryPattern)
  }

  // Extract participant number from binary pattern
  const extractParticipantFromPattern = (pattern: string): string | null => {
    // Try different chunk sizes to decode text
    const chunkSizes = [8, 7, 6, 5]

    for (const chunkSize of chunkSizes) {
      let text = ""

      for (let i = 0; i < pattern.length - chunkSize + 1; i += chunkSize) {
        const chunk = pattern.substring(i, i + chunkSize)
        const charCode = Number.parseInt(chunk, 2)

        // Convert to character if it's printable ASCII
        if ((charCode >= 65 && charCode <= 90) || (charCode >= 48 && charCode <= 57)) {
          text += String.fromCharCode(charCode)
        } else if (charCode >= 97 && charCode <= 122) {
          // Convert lowercase to uppercase
          text += String.fromCharCode(charCode - 32)
        }
      }

      // Look for participant patterns
      const participantMatch = text.match(/[A-Z]{2,}[0-9]{2}/g)
      if (participantMatch) {
        return participantMatch[0]
      }
    }

    return null
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

  const clearDebugLog = () => {
    setDebugInfo([])
    setScanCount(0)
    setLastDetectedBarcode(null)
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
          <p className="text-gray-600">
            Kamera tidak terdeteksi atau tidak dapat diakses. Pastikan perangkat memiliki kamera dan izin telah
            diberikan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Scan className="h-5 w-5" />
          Long Distance Barcode Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera Status & Controls */}
        <div className="flex gap-2 items-center justify-between">
          <div className="flex gap-2 items-center">
            {cameraActive && isScanning && (
              <Badge variant="default" className="bg-green-100 text-green-800 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                Full Area Scanning ({scanCount} attempts)
              </Badge>
            )}

            {lastDetectedBarcode && (
              <Badge variant="default" className="bg-blue-100 text-blue-800 px-3 py-1">
                Last: {lastDetectedBarcode}
              </Badge>
            )}

            {cameraActive && (
              <Badge variant="default" className="bg-blue-100 text-blue-800 px-2 py-1">
                <Power className="h-3 w-3 mr-1" />
                Camera Active
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={clearDebugLog} variant="outline" size="sm">
              Clear Log
            </Button>
            {cameraActive && (
              <Button onClick={stopCamera} variant="destructive" size="sm">
                <PowerOff className="h-4 w-4 mr-1" />
                Stop Camera
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <Button onClick={startCamera} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
              Retry Camera Access
            </Button>
          </div>
        )}

        {/* Detection Results Only */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Detection Results
            {lastDetectedBarcode && (
              <Badge variant="default" className="bg-green-100 text-green-800 ml-2">
                {lastDetectedBarcode}
              </Badge>
            )}
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {debugInfo.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {cameraActive ? "Camera active - waiting for barcode detection..." : "Camera starting up..."}
              </p>
            ) : (
              debugInfo.map((log, index) => (
                <p key={index} className="text-xs font-mono bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                  {log}
                </p>
              ))
            )}
          </div>
          {cameraActive && isScanning && (
            <div className="text-xs text-gray-500 mt-2 flex justify-between">
              <span>Scan attempts: {scanCount}</span>
              {lastDetectedBarcode && <span className="text-green-600 font-bold">✅ {lastDetectedBarcode}</span>}
            </div>
          )}
        </div>

        {/* Camera View */}
        <div className="relative">
          <video
            ref={videoRef}
            className={`w-full h-64 bg-gray-100 rounded-lg object-cover ${cameraActive ? "block" : "hidden"}`}
            playsInline
            muted
          />

          {/* Scanning Overlay */}
          {cameraActive && isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Simple status indicator */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
                {lastDetectedBarcode ? `✅ ${lastDetectedBarcode}` : "🔍 Full Area Scanning..."}
              </div>

              {/* Instructions */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded text-sm">
                Scanning entire image - No distance limit
              </div>
            </div>
          )}

          {/* Placeholder when camera not active */}
          {!cameraActive && (
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Initializing camera...</p>
                <p className="text-xs text-gray-400 mt-1">Please allow camera access when prompted</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h4 className="font-medium text-green-900 mb-2">Auto-Start Long Distance Scanner:</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Kamera otomatis aktif saat halaman dimuat</li>
            <li>• Scan SELURUH area gambar tanpa batasan koordinat</li>
            <li>• Bisa deteksi barcode dari jarak jauh</li>
            <li>• Tidak perlu posisi tepat - arahkan saja ke barcode</li>
            <li>• Resolusi tinggi untuk akurasi jarak jauh</li>
          </ul>
        </div>

        {/* Sample Barcode for Testing */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="font-medium text-yellow-900 mb-2">Test dengan Sample Barcode:</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center justify-center bg-white p-2 rounded border">
              <img
                src="/barcode-sample.png"
                alt="Sample Barcode UI01"
                className="max-w-full h-auto"
                style={{ maxHeight: "60px" }}
              />
            </div>
            <div className="flex items-center justify-center bg-white p-2 rounded border">
              <img
                src="/barcode-itb01.png"
                alt="Sample Barcode ITB01"
                className="max-w-full h-auto"
                style={{ maxHeight: "60px" }}
              />
            </div>
            <div className="flex items-center justify-center bg-white p-2 rounded border">
              <img
                src="/barcode-ui01-sample.png"
                alt="Sample Barcode UI01"
                className="max-w-full h-auto"
                style={{ maxHeight: "60px" }}
              />
            </div>
          </div>
          <p className="text-xs text-yellow-700 mt-2 text-center">Arahkan kamera ke sample barcode ini untuk testing</p>
        </div>

        {/* Detection Status Summary */}
        {cameraActive && isScanning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-2">Scanning Status:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Total Scans:</span>
                <span className="font-bold ml-2">{scanCount}</span>
              </div>
              <div>
                <span className="text-blue-700">Last Detection:</span>
                <span className="font-bold ml-2">{lastDetectedBarcode || "None"}</span>
              </div>
            </div>
            {lastDetectedBarcode && (
              <div className="mt-2 p-2 bg-green-100 rounded text-green-800 text-sm">
                ✅ Successfully detected: <strong>{lastDetectedBarcode}</strong>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 