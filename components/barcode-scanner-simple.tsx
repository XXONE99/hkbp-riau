"use client"

import { useState, useRef, useEffect } from "react"
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

  const [hasCamera, setHasCamera] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [scanCount, setScanCount] = useState<number>(0)
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    checkCameraAvailability()
  }, [])

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
    } catch {
      setHasCamera(false)
    }
  }

  const startCamera = async () => {
    try {
      setError(null)
      setLastDetectedBarcode(null)

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
          videoRef.current?.play().then(() => {
            setCameraActive(true)
            onScanningChange(true)
            toast({
              title: "Kamera Aktif",
              description: "Kamera berhasil dinyalakan dan siap untuk scanning",
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
  }

  const stopCamera = () => {
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

    toast({
      title: "Kamera Dimatikan",
      description: "Semua aktivitas scanning dihentikan.",
    })
  }

  const startBarcodeDetection = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    scanIntervalRef.current = setInterval(() => detectBarcode(), 200)
  }

  const stopBarcodeDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  const detectBarcode = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    setScanCount((prev) => prev + 1)
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // First try QR Code detection with jsQR
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height)
    if (qrCode && qrCode.data && qrCode.data !== lastDetectedBarcode) {
      // Validate QR code format
      const validatedCode = validateParticipantCode(qrCode.data.trim())
      if (validatedCode) {
        const timestamp = new Date().toLocaleTimeString()
        const logMessage = `[${timestamp}] 🎯 QR CODE DETECTED: ${validatedCode}`
        setDebugInfo((prev) => [...prev.slice(-4), logMessage])
        setLastDetectedBarcode(validatedCode)
        onBarcodeDetected(validatedCode)
        flashScanEffect()
        toast({
          title: "QR Code Terdeteksi!",
          description: `Nomor peserta: ${validatedCode}`,
          duration: 2000,
        })
        setTimeout(() => setLastDetectedBarcode(null), 3000)
        return
      }
    }

    // If no QR code, try barcode detection
    const detectedBarcode = scanFullImageForBarcode(imageData)
    if (detectedBarcode && detectedBarcode !== lastDetectedBarcode) {
      const timestamp = new Date().toLocaleTimeString()
      const logMessage = `[${timestamp}] 🎯 BARCODE DETECTED: ${detectedBarcode}`
      setDebugInfo((prev) => [...prev.slice(-4), logMessage])
      setLastDetectedBarcode(detectedBarcode)
      onBarcodeDetected(detectedBarcode)
      flashScanEffect()
      toast({
        title: "Barcode Terdeteksi!",
        description: `Nomor peserta: ${detectedBarcode}`,
        duration: 2000,
      })
      setTimeout(() => setLastDetectedBarcode(null), 3000)
    }
  }

  // FIXED: Use the same validation logic as barcode-image-processor.ts
  const validateParticipantCode = (code: string): string | null => {
    // Valid participant patterns - sama seperti di barcode-image-processor.ts
    const participantPatterns = [
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
    
    for (const regex of participantPatterns) {
      if (regex.test(upperCode)) {
        console.log(`✅ Valid participant code detected: ${upperCode}`)
        return upperCode
      }
    }

    console.log(`❌ Invalid participant code format: ${code}`)
    return null
  }

  const scanFullImageForBarcode = (imageData: ImageData): string | null => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    // FIXED: Focus on text area (bottom 40% of image where participant numbers appear)
    const textStartY = Math.floor(height * 0.6)
    const textEndY = height

    console.log(`🔍 Scanning text area from y=${textStartY} to y=${textEndY}`)

    // Scan horizontal lines in text area
    for (let y = textStartY; y < textEndY; y += 2) {
      const result = scanLineForText(data, width, height, y, true)
      if (result) {
        console.log(`✅ Found barcode in horizontal line at y=${y}: ${result}`)
        return result
      }
    }

    // Scan vertical lines if horizontal fails
    for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.9); x += 3) {
      const result = scanLineForText(data, width, height, x, false)
      if (result) {
        console.log(`✅ Found barcode in vertical line at x=${x}: ${result}`)
        return result
      }
    }

    return null
  }

  // FIXED: Better text recognition logic
  const scanLineForText = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    index: number,
    isHorizontal: boolean
  ): string | null => {
    let binaryPattern = ""
    const threshold = 128

    const limit = isHorizontal ? width : height
    for (let i = 0; i < limit; i++) {
      const x = isHorizontal ? i : index
      const y = isHorizontal ? index : i
      
      if (x >= width || y >= height) continue
      
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      binaryPattern += gray < threshold ? "1" : "0"
    }

    return extractParticipantFromBinaryPattern(binaryPattern)
  }

  // FIXED: Use same logic as barcode-image-processor.ts
  const extractParticipantFromBinaryPattern = (pattern: string): string | null => {
    const chunkSizes = [8, 7, 6, 5]
    
    for (const chunkSize of chunkSizes) {
      let text = ""
      
      for (let i = 0; i <= pattern.length - chunkSize; i += chunkSize) {
        const chunk = pattern.substring(i, i + chunkSize)
        if (chunk.length === chunkSize) {
          const charCode = parseInt(chunk, 2)
          
          // Convert to character if it's printable ASCII
          if (charCode >= 32 && charCode <= 126) {
            text += String.fromCharCode(charCode)
          }
        }
      }

      // Look for participant patterns in the extracted text
      const participantPatterns = [
        /UI\d{2}/gi,
        /ITB\d{2}/gi,
        /UGM\d{2}/gi,
        /UNPAD\d{2}/gi,
        /ITS\d{2}/gi,
        /UNAIR\d{2}/gi,
        /UB\d{2}/gi,
        /UNDIP\d{2}/gi,
        /UNHAS\d{2}/gi,
        /UNS\d{2}/gi,
        /UNRI\d{2}/gi,
        /UNCEN\d{2}/gi,
      ]

      for (const regex of participantPatterns) {
        const match = text.match(regex)
        if (match) {
          console.log(`🎯 Pattern found in ${chunkSize}-bit: "${match[0]}" from text: "${text}"`)
          return match[0].toUpperCase()
        }
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

  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Scan className="h-5 w-5" />
          Barcode & QR Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {cameraActive && isScanning && (
              <Badge className="bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                Scanning...
              </Badge>
            )}
            {lastDetectedBarcode && (
              <Badge className="bg-blue-100 text-blue-800">Last: {lastDetectedBarcode}</Badge>
            )}
            {cameraActive && (
              <Badge className="bg-blue-100 text-blue-800">
                <Power className="w-3 h-3 mr-1" />
                Camera Active
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {!cameraActive && (
              <Button onClick={startCamera} variant="default" size="sm">
                <Camera className="w-4 h-4 mr-1" />
                Open Camera
              </Button>
            )}
            {cameraActive && (
              <Button onClick={stopCamera} variant="destructive" size="sm">
                <PowerOff className="w-4 h-4 mr-1" />
                Stop Camera
              </Button>
            )}
          </div>
        </div>

        {/* Display Detection Results */}
        <div className="bg-gray-50 p-3 rounded border border-gray-200">
          <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4" />
            Detection Results
          </h4>
          <div className="space-y-1 text-xs font-mono max-h-32 overflow-y-auto">
            {debugInfo.length > 0 ? (
              debugInfo.map((log, i) => (
                <div key={i} className="bg-green-100 text-green-800 px-2 py-1 rounded">{log}</div>
              ))
            ) : (
              <p className="text-gray-500">No detection yet.</p>
            )}
          </div>
        </div>

        <div className="relative">
          <video
            ref={videoRef}
            className={`w-full h-64 bg-gray-100 rounded ${cameraActive ? "block" : "hidden"}`}
            playsInline
            muted
          />
          {!cameraActive && (
            <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center flex-col text-gray-500">
              <Camera className="w-10 h-10 mb-2" />
              <p>Kamera belum aktif</p>
              <p className="text-xs text-gray-400">Klik "Open Camera" untuk memulai</p>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 mb-2">Format Kode yang Didukung:</h4>
          <div className="text-sm text-blue-700 grid grid-cols-2 gap-1">
            <div>• UI01, UI02, UI03...</div>
            <div>• ITB01, ITB02, ITB03...</div>
            <div>• UGM01, UGM02, UGM03...</div>
            <div>• UNPAD01, UNPAD02...</div>
            <div>• ITS01, ITS02, ITS03...</div>
            <div>• Dan format kampus lainnya</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}