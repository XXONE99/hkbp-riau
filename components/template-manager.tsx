"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Download, FileText, FileSpreadsheet, Info } from "lucide-react"
import { generateExcelFile } from "@/lib/excel-generator"

export function TemplateManager() {
  const { toast } = useToast()

  const downloadCSVTemplate = () => {
    // CSV format with comma separator
    const csvContent = `Nomor Peserta,Nama,Kampus
UI01,John Doe,Universitas Indonesia
ITB01,Jane Smith,Institut Teknologi Bandung
UGM01,Bob Wilson,Universitas Gadjah Mada
UNPAD01,Alice Johnson,Universitas Padjadjaran
ITS01,Charlie Brown,Institut Teknologi Sepuluh Nopember`

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "template_peserta_parheheon.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Template CSV Downloaded",
      description: "Template CSV berhasil didownload",
    })
  }

  const downloadExcelTemplate = () => {
    // Create Excel-compatible CSV data
    const excelData = [
      ["Nomor Peserta", "Nama", "Kampus"],
      ["UI01", "John Doe", "Universitas Indonesia"],
      ["ITB01", "Jane Smith", "Institut Teknologi Bandung"],
      ["UGM01", "Bob Wilson", "Universitas Gadjah Mada"],
      ["UNPAD01", "Alice Johnson", "Universitas Padjadjaran"],
      ["ITS01", "Charlie Brown", "Institut Teknologi Sepuluh Nopember"],
      ["UNAIR01", "Diana Prince", "Universitas Airlangga"],
      ["UB01", "Bruce Wayne", "Universitas Brawijaya"],
      ["UNDIP01", "Clark Kent", "Universitas Diponegoro"],
      ["UNHAS01", "Peter Parker", "Universitas Hasanuddin"],
      ["UNS01", "Tony Stark", "Universitas Sebelas Maret"],
    ]

    generateExcelFile(excelData, "template_peserta_parheheon_excel.csv")

    toast({
      title: "Template Excel Downloaded",
      description: "Template Excel-compatible CSV berhasil didownload",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Download Template Import
        </CardTitle>
        <CardDescription>
          Download template untuk memudahkan import data peserta dalam format yang benar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Petunjuk Penggunaan Template:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • <strong>CSV Template:</strong> File CSV standar untuk Google Sheets, LibreOffice
                </li>
                <li>
                  • <strong>Excel Template:</strong> File Excel (.xls) asli untuk Microsoft Excel
                </li>
                <li>• Jangan mengubah nama kolom header</li>
                <li>• Pastikan nomor peserta unik dan tidak duplikat</li>
                <li>• Simpan file dan upload kembali untuk import</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Template Download Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Button
              onClick={downloadCSVTemplate}
              variant="outline"
              className="w-full h-auto p-4 flex flex-col items-center gap-2 bg-transparent"
            >
              <FileText className="h-8 w-8 text-green-600" />
              <div className="text-center">
                <div className="font-medium">Template CSV</div>
                <div className="text-xs text-gray-500">File CSV dengan separator koma (,)</div>
              </div>
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Compatible dengan Google Sheets, LibreOffice, dan text editor
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={downloadExcelTemplate}
              variant="outline"
              className="w-full h-auto p-4 flex flex-col items-center gap-2 bg-transparent"
            >
              <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <div className="font-medium">Template Excel</div>
                <div className="text-xs text-gray-500">CSV dengan format Excel (separator ;)</div>
              </div>
            </Button>
            <p className="text-xs text-gray-500 text-center">CSV dengan encoding UTF-8 dan BOM untuk Microsoft Excel</p>
          </div>
        </div>

        {/* Format Comparison */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Perbedaan Format:</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CSV Format */}
            <div className="bg-green-50 rounded-lg p-3">
              <h5 className="font-medium text-green-800 mb-2">Format CSV</h5>
              <div className="space-y-1 text-xs text-green-700">
                <div>• File: .csv</div>
                <div>• Separator: Koma (,)</div>
                <div>• Encoding: UTF-8</div>
                <div>• Untuk: Google Sheets, LibreOffice</div>
              </div>
            </div>

            {/* Excel Format */}
            <div className="bg-blue-50 rounded-lg p-3">
              <h5 className="font-medium text-blue-800 mb-2">Format Excel</h5>
              <div className="space-y-1 text-xs text-blue-700">
                <div>• File: .csv (Excel-compatible)</div>
                <div>• Separator: Titik koma (;)</div>
                <div>• Encoding: UTF-8 dengan BOM</div>
                <div>• Untuk: Microsoft Excel, WPS Office</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
