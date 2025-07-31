"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Camera, Play, Pause, Scan } from "lucide-react"

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
  const { toast } = useToast()

  // Check camera availability
  useEffect(() => {
    checkCameraAvailability()
  }, [])

  // Handle scanning state changes
  useEffect(() => {
    if (isScanning) {
      startScanning()
    } else {
      stopScanning()
    }

    return () => {
      stopScanning()
    }
  }, [isScanning])

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasVideoInput = devices.some((device) => device.kind === "videoinput")
      setHasCamera(hasVideoInput)
    } catch (error) {
      console.error("Error checking camera availability:", error)
      setHasCamera(false)
    }
  }

  const startScanning = async () => {
    try {
      setError(null)

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera if available
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream

        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
            startBarcodeDetection()
          }
        }
      }

      toast({
        title: "Kamera Aktif",
        description: "Arahkan kamera ke barcode untuk scan otomatis",
      })
    } catch (error) {
      console.error("Error starting camera:", error)
      setError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.")
      onScanningChange(false)

      toast({
        title: "Error Kamera",
        description: "Gagal mengakses kamera. Periksa izin kamera.",
        variant: "destructive",
      })
    }
  }

  const stopScanning = () => {
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    // Stop barcode detection
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    setError(null)
  }

  const startBarcodeDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    // Scan for barcodes every 500ms
    scanIntervalRef.current = setInterval(() => {
      detectBarcode()
    }, 500)
  }

  const detectBarcode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for barcode detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Simple barcode detection (in a real app, you'd use a proper barcode library)
    const detectedBarcode = detectBarcodeFromImageData(imageData)

    if (detectedBarcode) {
      onBarcodeDetected(detectedBarcode)

      // Flash effect to indicate successful scan
      flashScanEffect()
    }
  }

  const detectBarcodeFromImageData = (imageData: ImageData): string | null => {
    // This is a simplified barcode detection
    // In a real implementation, you'd use libraries like QuaggaJS or ZXing

    // For demo purposes, we'll simulate barcode detection
    // by looking for specific patterns in the image

    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    // Look for barcode-like patterns (alternating black/white bars)
    let barcodePattern = ""
    const scanLine = Math.floor(height / 2) // Scan middle line

    for (let x = 0; x < width; x += 2) {
      const pixelIndex = (scanLine * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]

      // Convert to grayscale
      const gray = (r + g + b) / 3

      // Threshold for black/white
      barcodePattern += gray < 128 ? "1" : "0"
    }

    // Look for barcode start/stop patterns
    const startPattern = "11010010000"
    const stopPattern = "1100011101011"

    const startIndex = barcodePattern.indexOf(startPattern)
    const stopIndex = barcodePattern.indexOf(stopPattern)

    if (startIndex !== -1 && stopIndex !== -1 && stopIndex > startIndex) {
      // Extract and decode the barcode data
      const barcodeData = barcodePattern.substring(startIndex + startPattern.length, stopIndex)
      const decodedText = decodeBarcodePattern(barcodeData)

      if (decodedText && decodedText.length >= 3) {
        return decodedText
      }
    }

    return null
  }

  const decodeBarcodePattern = (pattern: string): string => {
    // Simple pattern decoding (reverse of encoding)
    let result = ""

    // Process pattern in chunks of 7 bits
    for (let i = 0; i < pattern.length - 6; i += 7) {
      const chunk = pattern.substring(i, i + 7)
      if (chunk.length === 7) {
        const charCode = Number.parseInt(chunk, 2)
        if (charCode > 0 && charCode < 128) {
          result += String.fromCharCode(charCode)
        }
      }
    }

    return result
  }

  const flashScanEffect = () => {
    if (videoRef.current) {
      videoRef.current.style.filter = "brightness(1.5)"
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.style.filter = "none"
        }
      }, 200)
    }
  }

  const toggleScanning = () => {
    onScanningChange(!isScanning)
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
          Scanner Barcode Real-time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera Controls */}
        <div className="flex gap-2">
          <Button
            onClick={toggleScanning}
            variant={isScanning ? "destructive" : "default"}
            className={isScanning ? "rounded-md" : "bg-blue-600 hover:bg-blue-700 text-white rounded-md"}
          >
            {isScanning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Scanning
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Scanning
              </>
            )}
          </Button>

          {isScanning && (
            <Badge variant="default" className="bg-green-100 text-green-800 px-3 py-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              Scanning Active
            </Badge>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Camera View */}
        <div className="relative">
          <video
            ref={videoRef}
            className={`w-full h-64 bg-gray-100 rounded-lg object-cover ${isScanning ? "block" : "hidden"}`}
            playsInline
            muted
          />

          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Scanning line */}
              <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 animate-pulse"></div>

              {/* Corner markers */}
              <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-red-500"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-red-500"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-red-500"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-red-500"></div>

              {/* Instructions */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                Arahkan ke barcode
              </div>
            </div>
          )}

          {/* Placeholder when not scanning */}
          {!isScanning && (
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Klik "Start Scanning" untuk memulai</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 mb-2">Cara Menggunakan:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Klik "Start Scanning" untuk mengaktifkan kamera</li>
            <li>• Arahkan kamera ke barcode peserta</li>
            <li>• Scanner akan otomatis mendeteksi dan memproses barcode</li>
            <li>• Klik "Stop Scanning" untuk menonaktifkan kamera</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
