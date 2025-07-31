"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Camera, Play, Pause, Scan } from "lucide-react"
import jsQR from "jsqr"

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

  useEffect(() => {
    checkCameraAvailability()
  }, [])

  useEffect(() => {
    if (isScanning) {
      startScanning()
    } else {
      stopScanning()
    }

    return () => stopScanning()
  }, [isScanning])

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasVideoInput = devices.some((device) => device.kind === "videoinput")
      setHasCamera(hasVideoInput)
    } catch (error) {
      setHasCamera(false)
    }
  }

  const startScanning = async () => {
    try {
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          startBarcodeDetection()
        }
      }

      toast({
        title: "Kamera Aktif",
        description: "Arahkan kamera ke barcode atau QR untuk mendeteksi otomatis",
      })
    } catch (error) {
      setError("Gagal membuka kamera. Pastikan izin kamera diberikan.")
      onScanningChange(false)
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    setError(null)
  }

  const startBarcodeDetection = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)

    scanIntervalRef.current = setInterval(() => {
      detectCode()
    }, 300)
  }

  const detectCode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // First try QR Code with jsQR
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height)
    if (qrCode?.data) {
      handleDetection(qrCode.data.trim(), "qr")
      return
    }

    // If no QR, fallback to smart barcode pattern
    const barcode = detectTextBarcode(imageData)
    if (barcode) {
      handleDetection(barcode.trim(), "barcode")
    }
  }

  const handleDetection = (code: string, type: "qr" | "barcode") => {
    onBarcodeDetected(code)
    flashScanEffect()

    toast({
      title: `${type === "qr" ? "QR Code" : "Barcode"} Terdeteksi`,
      description: code,
      duration: 2000,
    })
  }

  const detectTextBarcode = (imageData: ImageData): string | null => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    const textAreaStartY = Math.floor(height * 0.6)

    const chunkSizes = [8, 7, 6, 5]
    for (let y = textAreaStartY; y < height; y += 2) {
      let row = ""
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        row += gray < 128 ? "1" : "0"
      }

      for (const chunkSize of chunkSizes) {
        let text = ""
        for (let i = 0; i < row.length - chunkSize + 1; i += chunkSize) {
          const chunk = row.slice(i, i + chunkSize)
          const charCode = parseInt(chunk, 2)
          if (charCode >= 48 && charCode <= 90) {
            text += String.fromCharCode(charCode)
          }
        }
        const match = text.match(/[A-Z]{2,}[0-9]{2,}/)
        if (match) return match[0]
      }
    }

    return null
  }

  const flashScanEffect = () => {
    if (videoRef.current) {
      videoRef.current.style.filter = "brightness(1.5) contrast(1.2)"
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
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 flex gap-2 items-center">
            <Camera className="w-5 h-5" />
            Kamera Tidak Tersedia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Pastikan perangkat memiliki kamera dan izin sudah diberikan.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Scan className="h-5 w-5" />
          Barcode & QR Scanner (Realtime)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Button
            onClick={toggleScanning}
            variant={isScanning ? "destructive" : "default"}
          >
            {isScanning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Stop Scanning
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Scanning
              </>
            )}
          </Button>

          {isScanning && (
            <Badge className="bg-green-100 text-green-800 px-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
              Scanning Active
            </Badge>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 p-3 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="relative">
          <video
            ref={videoRef}
            className={`w-full h-64 bg-gray-100 rounded ${isScanning ? "block" : "hidden"}`}
            playsInline
            muted
          />
          {!isScanning && (
            <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-500">
              <Camera className="w-8 h-8 mr-2" />
              Kamera belum aktif
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}
