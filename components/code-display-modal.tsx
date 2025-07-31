"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, QrCode, BarChart3, X } from "lucide-react"
import { generateQRCode, downloadQRCode } from "@/lib/qr-generator"
import { generateBarcode, downloadBarcode } from "@/lib/barcode-generator"
import { useToast } from "@/hooks/use-toast"

interface CodeDisplayModalProps {
  isOpen: boolean
  onClose: () => void
  participantNumber: string
  participantName: string
}

export function CodeDisplayModal({ isOpen, onClose, participantNumber, participantName }: CodeDisplayModalProps) {
  const [activeTab, setActiveTab] = useState("qr")
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  // Generate codes when modal opens
  const generateCodes = async () => {
    if (isGenerating) return
    
    setIsGenerating(true)
    
    try {
      // Generate QR Code
      const qrResult = await generateQRCode(participantNumber, participantName)
      if (qrResult.success && qrResult.dataUrl) {
        setQrCodeUrl(qrResult.dataUrl)
      }

      // Generate Barcode
      const barcodeResult = generateBarcode(participantNumber, participantName)
      if (barcodeResult.success && barcodeResult.dataUrl) {
        setBarcodeUrl(barcodeResult.dataUrl)
      }
    } catch (error) {
      console.error('Error generating codes:', error)
      toast({
        title: "Error",
        description: "Gagal mengenerate kode",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate codes when modal opens
  useEffect(() => {
    if (isOpen && (!qrCodeUrl || !barcodeUrl)) {
      generateCodes()
    }
  }, [isOpen, participantNumber, participantName])

  const handleDownloadQR = async () => {
    try {
      const result = await downloadQRCode(participantNumber, participantName)
      if (result.success) {
        toast({
          title: "QR Code Downloaded",
          description: `QR Code untuk ${participantName} berhasil didownload (480x270)`,
        })
      } else {
        toast({
          title: "Error",
          description: "Gagal mengenerate QR Code",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengenerate QR Code",
        variant: "destructive",
      })
    }
  }

  const handleDownloadBarcode = () => {
    const result = downloadBarcode(participantNumber, participantName)
    if (result.success) {
      toast({
        title: "Barcode Downloaded",
        description: `Barcode untuk ${participantName} berhasil didownload (480x270)`,
      })
    } else {
      toast({
        title: "Error",
        description: "Gagal mengenerate Barcode",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              <BarChart3 className="h-5 w-5" />
              QR Code & Barcode
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Participant Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">{participantName}</p>
                <p className="text-blue-700">{participantNumber}</p>
              </div>
              <Badge variant="outline" className="bg-white">
                16:9 Resolution (480x270)
              </Badge>
            </div>
          </div>

          {/* Tabs for QR Code and Barcode */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="barcode" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Barcode
              </TabsTrigger>
            </TabsList>

            {/* QR Code Tab */}
            <TabsContent value="qr" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 inline-block">
                      {qrCodeUrl && !isGenerating ? (
                        <img
                          src={qrCodeUrl}
                          alt={`QR Code for ${participantNumber}`}
                          className="max-w-full h-auto"
                          style={{ maxWidth: "400px", maxHeight: "225px" }}
                        />
                      ) : (
                        <div className="w-80 h-45 flex items-center justify-center bg-gray-100 rounded">
                          <div className="text-center">
                            <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500">
                              {isGenerating ? "Generating QR Code..." : "QR Code akan di-generate..."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        QR Code untuk peserta <strong>{participantName}</strong>
                      </p>
                      <p className="text-xs text-gray-500">Format: PNG • Resolusi: 480x270 (16:9) • Ukuran: ~15KB</p>
                    </div>

                    <Button 
                      onClick={handleDownloadQR} 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isGenerating || !qrCodeUrl}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR Code (16:9)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Barcode Tab */}
            <TabsContent value="barcode" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 inline-block">
                      {barcodeUrl ? (
                        <img
                          src={barcodeUrl || "/placeholder.svg"}
                          alt={`Barcode for ${participantNumber}`}
                          className="max-w-full h-auto"
                          style={{ maxWidth: "400px", maxHeight: "225px" }}
                        />
                      ) : (
                        <div className="w-80 h-45 flex items-center justify-center bg-gray-100 rounded">
                          <div className="text-center">
                            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500">Generating Barcode...</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Barcode untuk peserta <strong>{participantName}</strong>
                      </p>
                      <p className="text-xs text-gray-500">Format: PNG • Resolusi: 480x270 (16:9) • Ukuran: ~12KB</p>
                    </div>

                    <Button onClick={handleDownloadBarcode} className="bg-green-600 hover:bg-green-700 text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Download Barcode (16:9)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Cara Penggunaan:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                • <strong>QR Code:</strong> Dapat dibaca oleh aplikasi QR scanner umum
              </li>
              <li>
                • <strong>Barcode:</strong> Dapat dibaca oleh barcode scanner standar
              </li>
              <li>
                • <strong>Format:</strong> Kedua kode dalam resolusi 16:9 (480x270 pixel)
              </li>
              <li>
                • <strong>Cetak:</strong> Cocok untuk dicetak dalam berbagai ukuran
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
