// Updated file parser with proper Excel support

export interface ParsedParticipant {
  participant_number: string
  name: string
  campus: string
}

export interface ParseResult {
  success: boolean
  data: ParsedParticipant[]
  errors: string[]
  format: "csv" | "excel" | "xlsx" | "unknown"
}

export function detectFileFormat(file: File): "csv" | "excel" | "xlsx" | "unknown" {
  const extension = file.name.toLowerCase().split(".").pop()
  const filename = file.name.toLowerCase()

  // Check file extension first
  if (extension === "xlsx" || extension === "xls") {
    return "xlsx"
  }

  if (extension === "csv") {
    // Check if it's Excel-optimized CSV
    if (filename.includes("excel")) {
      return "excel"
    }
    return "csv"
  }

  return "unknown"
}

export function parseCSVContent(content: string): ParseResult {
  try {
    // Remove BOM if present
    const cleanContent = content.replace(/^\uFEFF/, "")
    const lines = cleanContent.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      return {
        success: false,
        data: [],
        errors: ["File harus memiliki minimal header dan 1 baris data"],
        format: "csv",
      }
    }

    const participants: ParsedParticipant[] = []
    const errors: string[] = []

    // Skip header (first line)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))

      if (values.length < 3) {
        errors.push(`Baris ${i + 1}: Data tidak lengkap (butuh 3 kolom)`)
        continue
      }

      const [participant_number, name, campus] = values

      if (!participant_number || !name || !campus) {
        errors.push(`Baris ${i + 1}: Ada kolom yang kosong`)
        continue
      }

      participants.push({
        participant_number: participant_number.toUpperCase(),
        name,
        campus,
      })
    }

    return {
      success: errors.length === 0,
      data: participants,
      errors,
      format: "csv",
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: ["Gagal memparse file CSV"],
      format: "csv",
    }
  }
}

export function parseExcelCSVContent(content: string): ParseResult {
  try {
    // Remove BOM if present
    const cleanContent = content.replace(/^\uFEFF/, "")
    const lines = cleanContent.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      return {
        success: false,
        data: [],
        errors: ["File harus memiliki minimal header dan 1 baris data"],
        format: "excel",
      }
    }

    const participants: ParsedParticipant[] = []
    const errors: string[] = []

    // Skip header (first line)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(";").map((v) => v.trim().replace(/^"|"$/g, ""))

      if (values.length < 3) {
        errors.push(`Baris ${i + 1}: Data tidak lengkap (butuh 3 kolom)`)
        continue
      }

      const [participant_number, name, campus] = values

      if (!participant_number || !name || !campus) {
        errors.push(`Baris ${i + 1}: Ada kolom yang kosong`)
        continue
      }

      participants.push({
        participant_number: participant_number.toUpperCase(),
        name,
        campus,
      })
    }

    return {
      success: errors.length === 0,
      data: participants,
      errors,
      format: "excel",
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: ["Gagal memparse file Excel CSV"],
      format: "excel",
    }
  }
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const { parseExcelFile: parseExcel } = await import("./excel-generator")
    const rows = await parseExcel(file)

    if (rows.length < 2) {
      return {
        success: false,
        data: [],
        errors: ["File Excel harus memiliki minimal header dan 1 baris data"],
        format: "xlsx",
      }
    }

    const participants: ParsedParticipant[] = []
    const errors: string[] = []

    // Skip header (first row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]

      if (row.length < 3) {
        errors.push(`Baris ${i + 1}: Data tidak lengkap (butuh 3 kolom)`)
        continue
      }

      const [participant_number, name, campus] = row

      if (!participant_number || !name || !campus) {
        errors.push(`Baris ${i + 1}: Ada kolom yang kosong`)
        continue
      }

      participants.push({
        participant_number: participant_number.toString().toUpperCase(),
        name: name.toString(),
        campus: campus.toString(),
      })
    }

    return {
      success: errors.length === 0,
      data: participants,
      errors,
      format: "xlsx",
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: ["Gagal memparse file Excel"],
      format: "xlsx",
    }
  }
}

export async function parseFileContent(file: File): Promise<ParseResult> {
  const format = detectFileFormat(file)

  if (format === "xlsx") {
    return await parseExcelFile(file)
  }

  // For CSV files, read as text
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string

      switch (format) {
        case "csv":
          resolve(parseCSVContent(content))
          break
        case "excel":
          resolve(parseExcelCSVContent(content))
          break
        default:
          resolve({
            success: false,
            data: [],
            errors: ["Format file tidak dikenali. Gunakan template yang telah disediakan."],
            format: "unknown",
          })
      }
    }
    reader.readAsText(file)
  })
}
