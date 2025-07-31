// Simplified Excel-compatible file generator
export function generateExcelFile(data: any[][], filename: string) {
  // Create Excel-compatible CSV with proper formatting
  const createExcelCSV = (worksheetData: any[][]) => {
    // Use semicolon separator for Excel (especially for Indonesian locale)
    const csvContent = worksheetData
      .map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if contains special characters
            const cellStr = String(cell)
            if (cellStr.includes(";") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          })
          .join(";"),
      )
      .join("\n")

    return csvContent
  }

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = "\uFEFF"
  const csvContent = BOM + createExcelCSV(data)

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  })

  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function parseExcelFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        // Remove BOM if present
        const cleanContent = content.replace(/^\uFEFF/, "")

        const lines = cleanContent.split("\n").filter((line) => line.trim())
        const rows: any[][] = []

        lines.forEach((line) => {
          // Parse CSV with semicolon separator
          const cells: string[] = []
          let current = ""
          let inQuotes = false

          for (let i = 0; i < line.length; i++) {
            const char = line[i]

            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"'
                i++ // Skip next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes
              }
            } else if (char === ";" && !inQuotes) {
              // End of cell
              cells.push(current.trim())
              current = ""
            } else {
              current += char
            }
          }

          // Add last cell
          cells.push(current.trim())
          rows.push(cells)
        })

        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}
