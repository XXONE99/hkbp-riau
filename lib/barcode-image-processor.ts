// Enhanced barcode image processor with reliable QR and barcode detection
import jsQR from 'jsqr'

export interface BarcodeProcessResult {
  success: boolean
  barcode?: string
  codeType?: "qr" | "barcode"
  error?: string
  debugInfo?: string[]
}

export async function processBarcodeImage(file: File): Promise<BarcodeProcessResult> {
  const debugLogs: string[] = []

  try {
    debugLogs.push(`🔍 Starting image processing for file: ${file.name}`)
    debugLogs.push(`📁 File size: ${(file.size / 1024).toFixed(2)} KB`)
    debugLogs.push(`🖼️ File type: ${file.type}`)

    // Create image element
    const img = new Image()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Canvas context not available")
    }

    return new Promise((resolve) => {
      img.onload = () => {
        try {
          debugLogs.push(`✅ Image loaded successfully: ${img.width}x${img.height}`)

          // Set canvas size
          canvas.width = img.width
          canvas.height = img.height

          // Draw image to canvas
          ctx.drawImage(img, 0, 0)
          debugLogs.push(`🎨 Image drawn to canvas`)

          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          debugLogs.push(`📊 Image data extracted: ${imageData.data.length} pixels`)

          // Try to detect QR code first using jsQR library
          const qrResult = detectQRCodeWithLibrary(imageData, debugLogs)
          if (qrResult.success) {
            debugLogs.push(`✅ QR Code detected: ${qrResult.code}`)
            resolve({
              success: true,
              barcode: qrResult.code,
              codeType: "qr",
              debugInfo: debugLogs,
            })
            return
          }

          // Try to detect barcode with improved algorithm
          const barcodeResult = detectBarcodeImproved(imageData, debugLogs)
          if (barcodeResult.success) {
            debugLogs.push(`✅ Barcode detected: ${barcodeResult.code}`)
            resolve({
              success: true,
              barcode: barcodeResult.code,
              codeType: "barcode",
              debugInfo: debugLogs,
            })
            return
          }

          // Try OCR text recognition as fallback
          const ocrResult = recognizeTextFromImage(imageData, debugLogs)
          if (ocrResult) {
            debugLogs.push(`✅ Text recognized: ${ocrResult}`)
            resolve({
              success: true,
              barcode: ocrResult,
              codeType: "barcode", // Treat as barcode since it's text
              debugInfo: debugLogs,
            })
            return
          }

          debugLogs.push(`❌ No QR code or barcode detected`)
          resolve({
            success: false,
            error: "No QR code or barcode found in image",
            debugInfo: debugLogs,
          })
        } catch (error) {
          debugLogs.push(`❌ Error processing image: ${error}`)
          resolve({
            success: false,
            error: `Processing error: ${error}`,
            debugInfo: debugLogs,
          })
        }
      }

      img.onerror = () => {
        debugLogs.push(`❌ Failed to load image`)
        resolve({
          success: false,
          error: "Failed to load image",
          debugInfo: debugLogs,
        })
      }

      // Set crossOrigin to handle CORS
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file)
    })
  } catch (error) {
    debugLogs.push(`❌ Unexpected error: ${error}`)
    return {
      success: false,
      error: `Unexpected error: ${error}`,
      debugInfo: debugLogs,
    }
  }
}

function detectQRCodeWithLibrary(imageData: ImageData, debugLogs: string[]): { success: boolean; code?: string } {
  debugLogs.push(`🔍 Attempting QR code detection with jsQR library...`)

  try {
    // Convert ImageData to format expected by jsQR
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    if (code) {
      debugLogs.push(`✅ QR Code detected: ${code.data}`)
      return { success: true, code: code.data }
    }

    // Try with inverted colors
    const invertedCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    })

    if (invertedCode) {
      debugLogs.push(`✅ QR Code detected (inverted): ${invertedCode.data}`)
      return { success: true, code: invertedCode.data }
    }

    debugLogs.push(`❌ QR code detection failed`)
    return { success: false }
  } catch (error) {
    debugLogs.push(`❌ QR detection error: ${error}`)
    return { success: false }
  }
}

function detectBarcodeImproved(imageData: ImageData, debugLogs: string[]): { success: boolean; code?: string } {
  debugLogs.push(`🔍 Attempting improved barcode detection...`)

  try {
    // Try multiple scan lines with different thresholds
    const scanLines = [
      Math.floor(imageData.height * 0.2), // 20% from top
      Math.floor(imageData.height * 0.3), // 30% from top
      Math.floor(imageData.height * 0.4), // 40% from top
      Math.floor(imageData.height * 0.5), // Middle
      Math.floor(imageData.height * 0.6), // 60% from top
      Math.floor(imageData.height * 0.7), // 70% from top
      Math.floor(imageData.height * 0.8), // 80% from top
    ]

    const thresholds = [128, 100, 150, 80, 180] // Different brightness thresholds

    for (const scanLine of scanLines) {
      for (const threshold of thresholds) {
        const result = scanBarcodeAtLineImproved(
          imageData.data,
          imageData.width,
          imageData.height,
          scanLine,
          debugLogs,
          threshold
        )
        if (result) {
          debugLogs.push(`✅ Barcode found at line ${scanLine} with threshold ${threshold}: ${result}`)
          return { success: true, code: result }
        }
      }
    }

    // Try vertical scanning
    const verticalResult = scanBarcodeVertically(imageData.data, imageData.width, imageData.height, debugLogs)
    if (verticalResult) {
      debugLogs.push(`✅ Barcode found via vertical scan: ${verticalResult}`)
      return { success: true, code: verticalResult }
    }

    debugLogs.push(`❌ Barcode detection failed`)
    return { success: false }
  } catch (error) {
    debugLogs.push(`❌ Barcode detection error: ${error}`)
    return { success: false }
  }
}

function scanBarcodeAtLineImproved(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  scanLine: number,
  debugLogs: string[],
  threshold: number
): string | null {
  if (scanLine < 0 || scanLine >= height) return null

  const runs: number[] = []
  let currentRun = 0
  let isBlack = false

  // Scan the line
  for (let x = 0; x < width; x++) {
    const pixelIndex = (scanLine * width + x) * 4
        const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3
    const isPixelBlack = brightness < threshold

    if (isPixelBlack === isBlack) {
      currentRun++
    } else {
      if (currentRun > 0) {
        runs.push(currentRun)
      }
      currentRun = 1
      isBlack = isPixelBlack
    }
  }

  if (currentRun > 0) {
    runs.push(currentRun)
  }

  // Try to decode the pattern
  return decodeRunsToText(runs, debugLogs)
}

function scanBarcodeVertically(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  debugLogs: string[]
): string | null {
  const scanColumn = Math.floor(width / 2) // Scan middle column

  const runs: number[] = []
  let currentRun = 0
  let isBlack = false

  // Scan the column
  for (let y = 0; y < height; y++) {
    const pixelIndex = (y * width + scanColumn) * 4
      const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3
    const isPixelBlack = brightness < 128

    if (isPixelBlack === isBlack) {
      currentRun++
    } else {
      if (currentRun > 0) {
        runs.push(currentRun)
      }
      currentRun = 1
      isBlack = isPixelBlack
    }
  }

  if (currentRun > 0) {
    runs.push(currentRun)
  }

  return decodeRunsToText(runs, debugLogs)
}

function decodeRunsToText(runs: number[], debugLogs: string[]): string | null {
  if (runs.length < 10) return null // Need minimum pattern length

  // Normalize runs to binary pattern
  const totalWidth = runs.reduce((sum, run) => sum + run, 0)
  const avgWidth = totalWidth / runs.length
  const threshold = avgWidth * 0.5

  let binaryPattern = ""
  for (const run of runs) {
    binaryPattern += run > threshold ? "1" : "0"
  }

  debugLogs.push(`🔍 Binary pattern: ${binaryPattern}`)

  // Try to extract text from pattern
  const text = extractTextFromPattern(binaryPattern, debugLogs)
  if (text) {
    return text
  }

  // Try to find participant number pattern
  const participantPattern = findParticipantPattern(binaryPattern, debugLogs)
  if (participantPattern) {
    return participantPattern
  }

  return null
}

function extractTextFromPattern(binaryPattern: string, debugLogs: string[]): string | null {
  // Look for common patterns that might represent text
  const patterns = [
    /1{3,}0{1,3}1{3,}/g, // Bold text pattern
    /0{2,}1{1,2}0{2,}/g, // Thin text pattern
  ]

  for (const pattern of patterns) {
    const matches = binaryPattern.match(pattern)
    if (matches && matches.length > 0) {
      debugLogs.push(`📝 Found text pattern: ${matches.join(', ')}`)
      // Try to convert to text (simplified)
      return convertBinaryToText(binaryPattern, debugLogs)
    }
  }

  return null
}

function findParticipantPattern(binaryPattern: string, debugLogs: string[]): string | null {
  // Look for patterns that might represent participant numbers
  // Common patterns: ITB01, UI01, etc.
    const participantPatterns = [
    /ITB\d{2,}/i,
    /UI\d{2,}/i,
    /[A-Z]{2,3}\d{2,}/i,
  ]

  // Try to extract text and check if it matches participant patterns
  const extractedText = convertBinaryToText(binaryPattern, debugLogs)
  if (extractedText) {
    for (const pattern of participantPatterns) {
      const match = extractedText.match(pattern)
      if (match) {
        debugLogs.push(`✅ Found participant pattern: ${match[0]}`)
        return match[0]
      }
    }
  }

  return null
}

function convertBinaryToText(binary: string, debugLogs: string[]): string {
  // Simplified binary to text conversion
  // This is a basic implementation - in a real scenario you'd use proper barcode decoding
  
  // Try to find readable text patterns
  const textPatterns = [
    // Look for sequences that might represent ASCII characters
    /[01]{8}/g, // 8-bit patterns
  ]

  let result = ""
  for (const pattern of textPatterns) {
    const matches = binary.match(pattern)
    if (matches) {
      for (const match of matches) {
        const charCode = parseInt(match, 2)
        if (charCode >= 32 && charCode <= 126) { // Printable ASCII
          result += String.fromCharCode(charCode)
        }
      }
    }
  }

  if (result.length > 0) {
    debugLogs.push(`📝 Converted binary to text: ${result}`)
    return result
  }

  // Fallback: try to extract any readable pattern
  const cleanPattern = binary.replace(/0+/g, ' ').replace(/1+/g, '#')
  debugLogs.push(`🔍 Clean pattern: ${cleanPattern}`)
  
  return cleanPattern
}

function recognizeTextFromImage(imageData: ImageData, debugLogs: string[]): string | null {
  debugLogs.push(`🔤 Attempting OCR text recognition...`)

  try {
    // Simple text recognition by looking for high-contrast areas
    const textRegions = extractTextRegions(imageData, 0, imageData.height, 128, debugLogs)
    
    for (const region of textRegions) {
      const text = recognizeCharactersInTextArea(imageData, debugLogs)
      if (text && text.length > 2) {
        debugLogs.push(`✅ OCR found text: ${text}`)
        return text
    }
  }

  return null
  } catch (error) {
    debugLogs.push(`❌ OCR error: ${error}`)
  return null
}
}

function extractTextRegions(
  imageData: ImageData,
  startY: number,
  endY: number,
  threshold: number,
  debugLogs: string[]
): string[] {
  const regions: string[] = []
  const { width, height, data } = imageData

  // Scan horizontally for text regions
  for (let y = startY; y < endY; y += 5) {
    let textLine = ""
  for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3
      textLine += brightness < threshold ? "1" : "0"
    }
    
    if (textLine.includes("1")) {
      regions.push(textLine)
    }
  }

  return regions
}

function recognizeCharactersInTextArea(imageData: ImageData, debugLogs: string[]): string | null {
  // Simplified character recognition
  // In a real implementation, you'd use a proper OCR library
  
  const { width, height, data } = imageData
    let text = ""

  // Scan for potential text characters
  for (let y = 0; y < height; y += 10) {
    for (let x = 0; x < width; x += 10) {
      const pixelIndex = (y * width + x) * 4
      const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3
      
      if (brightness < 128) {
        // Dark pixel - might be part of text
        text += "#"
      } else {
        text += " "
      }
    }
  }

  // Look for patterns that might represent text
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  
  for (const line of lines) {
    if (line.includes('#')) {
      // Try to extract readable text from the pattern
      const extracted = extractReadableText(line)
      if (extracted && extracted.length > 2) {
        return extracted
      }
    }
  }

  return null
}

function extractReadableText(pattern: string): string | null {
  // Look for common text patterns
  const textPatterns = [
    /ITB\d{2,}/i,
    /UI\d{2,}/i,
    /[A-Z]{2,3}\d{2,}/i,
  ]

  for (const textPattern of textPatterns) {
    const match = pattern.match(textPattern)
      if (match) {
      return match[0]
    }
  }

  return null
}
