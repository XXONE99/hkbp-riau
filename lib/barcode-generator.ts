// Barcode generator utility using Code128 format with 16:9 aspect ratio
export interface BarcodeGenerateResult {
  success: boolean
  dataUrl?: string
  error?: string
}

export function generateBarcode(text: string, participantName: string): BarcodeGenerateResult {
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

    // Barcode parameters
    const barcodeWidth = 300
    const barcodeHeight = 80
    const barcodeX = (width - barcodeWidth) / 2
    const barcodeY = 40

    // Generate barcode pattern
    const pattern = generateBarcodePattern(text)
    const barWidth = barcodeWidth / pattern.length

    // Draw barcode with better styling
    ctx.fillStyle = "#000000"
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "1") {
        ctx.fillRect(barcodeX + i * barWidth, barcodeY, barWidth, barcodeHeight)
      }
    }

    // Add text below barcode with better styling
    ctx.fillStyle = "#1a1a1a"
    ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif"
    ctx.textAlign = "center"

    // Participant number with better spacing
    ctx.fillText(text, width / 2, barcodeY + barcodeHeight + 30)

    // Participant name with different styling
    ctx.font = "14px 'Segoe UI', Arial, sans-serif"
    ctx.fillStyle = "#666666"
    ctx.fillText(participantName, width / 2, barcodeY + barcodeHeight + 50)

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
      error: `Barcode generation failed: ${error}`,
    }
  }
}

function generateBarcodePattern(text: string): string {
  // Code 128 start pattern
  let pattern = "11010010000" // Start B

  // Convert text to barcode pattern
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    const code = getCode128Pattern(char)
    pattern += code
  }

  // Add checksum (simplified)
  const checksum = calculateChecksum(text)
  pattern += getCode128Pattern(checksum)

  // Stop pattern
  pattern += "1100011101011"

  return pattern
}

function getCode128Pattern(charCode: number): string {
  // Simplified Code 128 patterns
  const patterns: { [key: number]: string } = {
    32: "11011001100", // Space
    48: "11001101100", // 0
    49: "11001100110", // 1
    50: "10010011000", // 2
    51: "10010001100", // 3
    52: "10001001100", // 4
    53: "10011001000", // 5
    54: "10011000100", // 6
    55: "10001100100", // 7
    56: "11001001000", // 8
    57: "11001000100", // 9
    65: "11010001100", // A
    66: "11000101100", // B
    67: "11000100110", // C
    68: "10110001100", // D
    69: "10011101100", // E
    70: "10011100110", // F
    71: "10111000100", // G
    72: "10001110100", // H
    73: "10001110010", // I
    74: "11001010010", // J
    75: "11001010000", // K
    76: "11001001000", // L
    77: "11001000100", // M
    78: "11001000010", // N
    79: "11001000000", // O
    80: "11000110000", // P
    81: "11000101000", // Q
    82: "11000100100", // R
    83: "11000100010", // S
    84: "11000100000", // T
    85: "11000011000", // U
    86: "11000010100", // V
    87: "11000010010", // W
    88: "11000010000", // X
    89: "11000001000", // Y
    90: "11000000100", // Z
  }

  return patterns[charCode] || patterns[32] // Default to space if character not found
}

function calculateChecksum(text: string): number {
  let sum = 104 // Start B value
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    sum += (char - 32) * (i + 1)
  }
  return (sum % 103) + 32
}

export function downloadBarcode(participantNumber: string, participantName: string): BarcodeGenerateResult {
  const result = generateBarcode(participantNumber, participantName)

  if (result.success && result.dataUrl) {
    // Create download link
    const link = document.createElement("a")
    link.download = `barcode-${participantNumber}-${participantName.replace(/\s+/g, "-")}.png`
    link.href = result.dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true }
  }

  return result
}

export function generateBarcodeBlob(participantNumber: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const result = generateBarcode(participantNumber, "Participant")
    
    if (result.success && result.dataUrl) {
      // Convert data URL to blob
      const byteString = atob(result.dataUrl.split(',')[1])
      const mimeString = result.dataUrl.split(',')[0].split(':')[1].split(';')[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      
      resolve(new Blob([ab], { type: mimeString }))
    } else {
      reject(new Error(result.error || "Failed to generate barcode"))
    }
  })
}
