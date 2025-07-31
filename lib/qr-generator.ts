// QR Code generator utility
import QRCode from 'qrcode'

export interface QRGenerateResult {
  success: boolean
  dataUrl?: string
  error?: string
}

export async function generateQRCode(text: string, participantName: string): Promise<QRGenerateResult> {
  try {
    // Create canvas with 16:9 aspect ratio (480x270)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      return { success: false, error: "Canvas context not available" }
    }

    // Set 16:9 dimensions
    const width = 480
    const height = 270
    canvas.width = width
    canvas.height = height

    // Fill white background with subtle gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, "#ffffff")
    gradient.addColorStop(1, "#f8f9fa")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Generate QR code using proper library
    const qrSize = 160 // QR code size
    const qrX = (width - qrSize) / 2
    const qrY = 25

    // Create QR code canvas
    const qrCanvas = document.createElement("canvas")
    qrCanvas.width = qrSize
    qrCanvas.height = qrSize

    // Generate QR code with proper options
    await QRCode.toCanvas(qrCanvas, text, {
      width: qrSize,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff"
      },
      errorCorrectionLevel: 'M'
    })

    // Draw QR code onto main canvas
    ctx.drawImage(qrCanvas, qrX, qrY)

    // Add subtle shadow behind QR code
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)"
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 2

    // Add text below QR code with better styling
    ctx.shadowColor = "transparent" // Reset shadow for text
    ctx.fillStyle = "#1a1a1a"
    ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif"
    ctx.textAlign = "center"

    // Participant number with better spacing
    ctx.fillText(text, width / 2, qrY + qrSize + 30)

    // Participant name with different styling
    ctx.font = "14px 'Segoe UI', Arial, sans-serif"
    ctx.fillStyle = "#666666"
    ctx.fillText(participantName, width / 2, qrY + qrSize + 50)

    // Add modern border with rounded corners effect
    ctx.strokeStyle = "#e1e5e9"
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1)

    // Add subtle inner border
    ctx.strokeStyle = "#f8f9fa"
    ctx.lineWidth = 1
    ctx.strokeRect(1.5, 1.5, width - 3, height - 3)

    return {
      success: true,
      dataUrl: canvas.toDataURL("image/png", 1.0),
    }
  } catch (error) {
    return {
      success: false,
      error: `QR generation failed: ${error}`,
    }
  }
}

export async function downloadQRCode(participantNumber: string, participantName: string): Promise<QRGenerateResult> {
  const result = await generateQRCode(participantNumber, participantName)

  if (result.success && result.dataUrl) {
    // Create download link
    const link = document.createElement("a")
    link.download = `qr-${participantNumber}-${participantName.replace(/\s+/g, "-")}.png`
    link.href = result.dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true }
  }

  return result
}
