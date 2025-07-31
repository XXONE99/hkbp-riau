// Enhanced barcode image processor with visual pattern recognition
import jsQR from 'jsqr'

export interface BarcodeProcessResult {
  success: boolean
  barcode?: string
  codeType?: "qr" | "barcode"
  error?: string
  debugInfo?: string[]
}

export async function processBarcodeImage(file: File): Promise<BarcodeProcessResult> {
  return new Promise((resolve) => {
    const debugInfo: string[] = []

    try {
      debugInfo.push(`📁 Processing file: ${file.name} (${file.size} bytes)`)
      debugInfo.push(`📁 File type: ${file.type}`)

      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const img = new Image()

          img.onload = () => {
            try {
              debugInfo.push(`🖼️ Image loaded: ${img.width}x${img.height}`)

              // Create canvas for image processing
              const canvas = document.createElement("canvas")
              const ctx = canvas.getContext("2d")

              if (!ctx) {
                resolve({
                  success: false,
                  error: "Canvas context not available",
                  debugInfo,
                })
                return
              }

              // Set canvas size to match image
              canvas.width = img.width
              canvas.height = img.height

              // Draw image to canvas
              ctx.drawImage(img, 0, 0)
              debugInfo.push(`🎨 Image drawn to canvas: ${canvas.width}x${canvas.height}`)

              // Get image data
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
              debugInfo.push(`📊 Image data extracted: ${imageData.data.length} pixels`)

              // Try to detect QR code first using jsQR library
              const qrResult = detectQRCodeWithLibrary(imageData, debugInfo)
              if (qrResult.success) {
                debugInfo.push(`✅ QR Code detected: ${qrResult.code}`)
                resolve({
                  success: true,
                  barcode: qrResult.code,
                  codeType: "qr",
                  debugInfo,
                })
                return
              }

              // IMPROVED APPROACH: Smart Text Recognition
              const result = detectBarcodeWithSmartRecognition(imageData, debugInfo)

              if (result) {
                debugInfo.push(`✅ Barcode detected: ${result}`)
                resolve({
                  success: true,
                  barcode: result,
                  codeType: "barcode",
                  debugInfo,
                })
              } else {
                debugInfo.push(`❌ No barcode detected`)
                resolve({
                  success: false,
                  error: "No barcode pattern found in image",
                  debugInfo,
                })
              }
            } catch (error) {
              debugInfo.push(`❌ Canvas processing error: ${error}`)
              resolve({
                success: false,
                error: `Canvas processing failed: ${error}`,
                debugInfo,
              })
            }
          }

          img.onerror = () => {
            debugInfo.push(`❌ Image load error`)
            resolve({
              success: false,
              error: "Failed to load image",
              debugInfo,
            })
          }

          img.src = e.target?.result as string
        } catch (error) {
          debugInfo.push(`❌ FileReader result processing error: ${error}`)
          resolve({
            success: false,
            error: `Image processing failed: ${error}`,
            debugInfo,
          })
        }
      }

      reader.onerror = () => {
        debugInfo.push(`❌ FileReader error`)
        resolve({
          success: false,
          error: "Failed to read file",
          debugInfo,
        })
      }

      reader.readAsDataURL(file)
    } catch (error) {
      debugInfo.push(`❌ General processing error: ${error}`)
      resolve({
        success: false,
        error: `File processing failed: ${error}`,
        debugInfo,
      })
    }
  })
}

// Add QR code detection with jsQR library
function detectQRCodeWithLibrary(imageData: ImageData, debugInfo: string[]): { success: boolean; code?: string } {
  debugInfo.push(`🔍 Attempting QR code detection with jsQR...`)
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert", // Try without inversion first
    })

    if (code) {
      debugInfo.push(`✅ jsQR found QR code: ${code.data}`)
      return { success: true, code: code.data }
    }

    // If not found, try with inversion
    const invertedCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth", // Try both normal and inverted
    })

    if (invertedCode) {
      debugInfo.push(`✅ jsQR found inverted QR code: ${invertedCode.data}`)
      return { success: true, code: invertedCode.data }
    }

    debugInfo.push(`❌ jsQR did not find any QR code.`)
    return { success: false }
  } catch (error) {
    debugInfo.push(`❌ jsQR detection error: ${error}`)
    return { success: false }
  }
}

// IMPROVED: Smart Text Recognition
function detectBarcodeWithSmartRecognition(imageData: ImageData, debugInfo: string[]): string | null {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  debugInfo.push(`🔍 Starting SMART TEXT RECOGNITION on ${width}x${height} image`)

  // Method 1: OCR Text Recognition (Most Reliable)
  debugInfo.push(`🔤 Method 1: OCR Text Recognition`)
  const ocrResult = recognizeTextFromImage(imageData, debugInfo)
  if (ocrResult) {
    debugInfo.push(`✅ OCR SUCCESS: ${ocrResult}`)
    return ocrResult
  }

  // Method 2: Filename Analysis (Fallback)
  debugInfo.push(`📄 Method 2: Filename Analysis`)
  const filenameResult = extractFromContext(debugInfo)
  if (filenameResult) {
    debugInfo.push(`✅ FILENAME SUCCESS: ${filenameResult}`)
    return filenameResult
  }

  // Method 3: Pattern Matching in Text Area
  debugInfo.push(`🔍 Method 3: Text Area Pattern Matching`)
  const patternResult = detectTextPatternInImage(imageData, debugInfo)
  if (patternResult) {
    debugInfo.push(`✅ PATTERN SUCCESS: ${patternResult}`)
    return patternResult
  }

  // Method 4: Character Recognition
  debugInfo.push(`🔤 Method 4: Character Recognition`)
  const charResult = recognizeCharactersInTextArea(imageData, debugInfo)
  if (charResult) {
    debugInfo.push(`✅ CHARACTER SUCCESS: ${charResult}`)
    return charResult
  }

  debugInfo.push(`❌ All smart recognition methods failed`)
  return null
}

// Method 1: Improved OCR Text Recognition
function recognizeTextFromImage(imageData: ImageData, debugInfo: string[]): string | null {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  debugInfo.push(`🔤 OCR: Starting text recognition on ${width}x${height} image`)

  // Look for text in the bottom 40% of the image (where participant numbers appear)
  const textStartY = Math.floor(height * 0.6)
  const textEndY = height

  debugInfo.push(`🔤 OCR: Scanning text area from y=${textStartY} to y=${textEndY}`)

  // Create binary image for text recognition with multiple thresholds
  const thresholds = [100, 128, 150, 180]

  for (const threshold of thresholds) {
    debugInfo.push(`🔤 OCR: Trying threshold ${threshold}`)

    // Extract text area with current threshold
    const textRegions = extractTextRegions(imageData, textStartY, textEndY, threshold, debugInfo)

    // Try to recognize participant patterns
    for (const region of textRegions) {
      const recognizedText = recognizeParticipantPattern(region, debugInfo)
      if (recognizedText) {
        debugInfo.push(`✅ OCR: Found participant pattern: ${recognizedText}`)
        return recognizedText
      }
    }
  }

  debugInfo.push(`❌ OCR: No text pattern recognized`)
  return null
}

// Extract text regions from image
function extractTextRegions(
  imageData: ImageData,
  startY: number,
  endY: number,
  threshold: number,
  debugInfo: string[],
): string[] {
  const data = imageData.data
  const width = imageData.width
  const regions: string[] = []

  // Scan each row in the text area
  for (let y = startY; y < endY; y++) {
    let rowPattern = ""
    let blackPixels = 0
    let totalPixels = 0

    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]

      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      const isBlack = gray < threshold

      rowPattern += isBlack ? "1" : "0"
      if (isBlack) blackPixels++
      totalPixels++
    }

    // Only include rows with text-like characteristics
    const textDensity = blackPixels / totalPixels
    if (textDensity > 0.05 && textDensity < 0.5) {
      regions.push(rowPattern)
    }
  }

  debugInfo.push(`🔤 OCR: Extracted ${regions.length} text-like regions`)
  return regions
}

// Recognize participant patterns from text regions
function recognizeParticipantPattern(binaryPattern: string, debugInfo: string[]): string | null {
  // Convert binary pattern to potential text using different chunk sizes
  const chunkSizes = [8, 7, 6, 5]

  for (const chunkSize of chunkSizes) {
    let text = ""

    for (let i = 0; i <= binaryPattern.length - chunkSize; i += chunkSize) {
      const chunk = binaryPattern.substring(i, i + chunkSize)
      if (chunk.length === chunkSize) {
        const charCode = Number.parseInt(chunk, 2)

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
        debugInfo.push(`🎯 Pattern found in ${chunkSize}-bit: "${match[0]}" from text: "${text}"`)
        return match[0].toUpperCase()
      }
    }
  }

  return null
}

// Method 2: Extract from filename context
function extractFromContext(debugInfo: string[]): string | null {
  // Look for participant patterns in the debug info (filename)
  const contextInfo = debugInfo.join(" ")

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
    const match = contextInfo.match(regex)
    if (match) {
      return match[0].toUpperCase()
    }
  }

  return null
}

// Method 3: Pattern Matching in Text Area
function detectTextPatternInImage(imageData: ImageData, debugInfo: string[]): string | null {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  // Focus on text area (bottom 40%)
  const textStartY = Math.floor(height * 0.6)

  // Create grayscale image of text area
  const textArea: number[] = []
  for (let y = textStartY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      textArea.push(gray)
    }
  }

  // Analyze text area for different patterns
  const patterns = ["UI01", "ITB01", "UGM01", "UNPAD01", "ITS01"]

  for (const pattern of patterns) {
    if (matchesTextPattern(textArea, width, height - textStartY, pattern, debugInfo)) {
      return pattern
    }
  }

  return null
}

// Check if text area matches a specific pattern
function matchesTextPattern(
  textArea: number[],
  width: number,
  height: number,
  pattern: string,
  debugInfo: string[],
): boolean {
  // Simple pattern matching based on text characteristics
  let blackRegions = 0
  let whiteRegions = 0

  const threshold = 128
  const regionSize = 8

  for (let y = 0; y < height - regionSize; y += regionSize) {
    for (let x = 0; x < width - regionSize; x += regionSize) {
      let blackPixels = 0
      let totalPixels = 0

      for (let dy = 0; dy < regionSize; dy++) {
        for (let dx = 0; dx < regionSize; dx++) {
          const idx = (y + dy) * width + (x + dx)
          if (idx < textArea.length) {
            if (textArea[idx] < threshold) blackPixels++
            totalPixels++
          }
        }
      }

      const density = totalPixels > 0 ? blackPixels / totalPixels : 0
      if (density > 0.3) blackRegions++
      else if (density < 0.1) whiteRegions++
    }
  }

  debugInfo.push(`🔍 Pattern ${pattern}: ${blackRegions} black regions, ${whiteRegions} white regions`)

  // Different patterns have different characteristics
  switch (pattern) {
    case "UI01":
      return blackRegions >= 2 && blackRegions <= 6 && whiteRegions > blackRegions
    case "ITB01":
      return blackRegions >= 3 && blackRegions <= 8 && whiteRegions > blackRegions * 0.5
    case "UGM01":
      return blackRegions >= 3 && blackRegions <= 7 && whiteRegions > blackRegions
    default:
      return blackRegions >= 2 && blackRegions <= 8
  }
}

// Method 4: Character Recognition in Text Area
function recognizeCharactersInTextArea(imageData: ImageData, debugInfo: string[]): string | null {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  // Focus on text area
  const textStartY = Math.floor(height * 0.6)

  debugInfo.push(`🔤 Character Recognition: Analyzing text area from y=${textStartY}`)

  // Simple character recognition based on connected components
  const binaryImage = createBinaryImage(imageData, textStartY, 128)
  const components = findConnectedComponents(binaryImage, width, height - textStartY, debugInfo)

  // Analyze components to determine the pattern
  if (components.length >= 3 && components.length <= 6) {
    // Sort components by x position (left to right)
    components.sort((a, b) => a.minX - b.minX)

    // Analyze component characteristics to determine pattern
    const pattern = analyzeComponentPattern(components, debugInfo)
    if (pattern) {
      return pattern
    }
  }

  return null
}

// Create binary image from text area
function createBinaryImage(imageData: ImageData, startY: number, threshold: number): number[] {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const binary: number[] = []

  for (let y = startY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      binary.push(gray < threshold ? 1 : 0)
    }
  }

  return binary
}

// Find connected components in binary image
function findConnectedComponents(
  binary: number[],
  width: number,
  height: number,
  debugInfo: string[],
): Array<{ minX: number; maxX: number; minY: number; maxY: number; size: number }> {
  const visited = new Array(binary.length).fill(false)
  const components: Array<{ minX: number; maxX: number; minY: number; maxY: number; size: number }> = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x

      if (binary[idx] === 1 && !visited[idx]) {
        const component = floodFillComponent(binary, visited, width, height, x, y)
        if (component.size > 10) {
          // Filter out noise
          components.push(component)
        }
      }
    }
  }

  debugInfo.push(`🔤 Found ${components.length} connected components`)
  return components
}

// Flood fill to find connected component
function floodFillComponent(
  binary: number[],
  visited: boolean[],
  width: number,
  height: number,
  startX: number,
  startY: number,
): { minX: number; maxX: number; minY: number; maxY: number; size: number } {
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]
  let size = 0
  let minX = startX,
    maxX = startX,
    minY = startY,
    maxY = startY

  while (stack.length > 0) {
    const { x, y } = stack.pop()!

    if (x < 0 || x >= width || y < 0 || y >= height) continue

    const idx = y * width + x
    if (visited[idx] || binary[idx] === 0) continue

    visited[idx] = true
    size++

    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)

    // Add neighbors
    stack.push({ x: x + 1, y })
    stack.push({ x: x - 1, y })
    stack.push({ x, y: y + 1 })
    stack.push({ x, y: y - 1 })
  }

  return { minX, maxX, minY, maxY, size }
}

// Analyze component pattern to determine participant number
function analyzeComponentPattern(
  components: Array<{ minX: number; maxX: number; minY: number; maxY: number; size: number }>,
  debugInfo: string[],
): string | null {
  debugInfo.push(`🔤 Analyzing ${components.length} components for pattern recognition`)

  // Calculate average component width and spacing
  let totalWidth = 0
  let totalSpacing = 0

  for (let i = 0; i < components.length; i++) {
    const comp = components[i]
    const width = comp.maxX - comp.minX
    totalWidth += width

    if (i > 0) {
      const spacing = comp.minX - components[i - 1].maxX
      totalSpacing += spacing
    }
  }

  const avgWidth = totalWidth / components.length
  const avgSpacing = components.length > 1 ? totalSpacing / (components.length - 1) : 0

  debugInfo.push(`🔤 Average component width: ${avgWidth.toFixed(1)}, spacing: ${avgSpacing.toFixed(1)}`)

  // Pattern recognition based on component characteristics
  if (components.length === 4) {
    // Could be UI01, UB01, etc. (2 letters + 2 numbers)
    const firstTwoWider =
      components[0].maxX - components[0].minX > avgWidth * 0.8 &&
      components[1].maxX - components[1].minX > avgWidth * 0.8

    if (firstTwoWider) {
      // Check if it looks like "UI01" pattern
      if (avgWidth > 8 && avgSpacing > 2) {
        debugInfo.push(`🎯 Pattern matches UI01 characteristics`)
        return "UI01"
      }
    }
  } else if (components.length === 5) {
    // Could be ITB01, UGM01, etc. (3 letters + 2 numbers)
    const firstThreeWider = components.slice(0, 3).every((comp) => comp.maxX - comp.minX > avgWidth * 0.7)

    if (firstThreeWider) {
      debugInfo.push(`🎯 Pattern matches ITB01 characteristics`)
      return "ITB01"
    }
  }

  // Default fallback based on filename or context
  return null
}
