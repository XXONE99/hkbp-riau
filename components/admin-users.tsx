"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import { Users } from "lucide-react"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { dbHelpers, type Participant, type Campus } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import {
  Upload,
  UserPlus,
  Search,
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  FileSpreadsheet,
  Info,
  Edit,
  Trash2,
  QrCode,
} from "lucide-react"
import { parseFileContent } from "@/lib/file-parser"
import { CodeDisplayModal } from "./code-display-modal"

export function AdminUsers() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    campus: "",
    campus_id: "",
  })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [importResult, setImportResult] = useState<{
    show: boolean
    success: boolean
    message: string
    details?: string[]
  }>({ show: false, success: false, message: "" })
  const { toast } = useToast()

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)

  // Code display modal state
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredParticipants(participants)
    } else {
      const filtered = participants.filter(
        (participant) =>
          participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          participant.participant_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          participant.campus.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredParticipants(filtered)
    }
  }, [participants, searchQuery])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch participants
      const { data: participantsData, error: participantsError } = await dbHelpers.getParticipants()
      if (participantsError) throw participantsError
      setParticipants(participantsData || [])

      // Fetch campuses
      const { data: campusesData, error: campusesError } = await dbHelpers.getCampuses()
      if (campusesError) throw campusesError
      setCampuses(campusesData || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const parseResult = await parseFileContent(file)

      if (!parseResult.success) {
        setImportResult({
          show: true,
          success: false,
          message: `Gagal memparse file (${parseResult.format.toUpperCase()})`,
          details: parseResult.errors,
        })
        return
      }

      if (parseResult.data.length === 0) {
        setImportResult({
          show: true,
          success: false,
          message: "Tidak ada data valid yang ditemukan",
          details: ["Pastikan file berisi data peserta yang valid"],
        })
        return
      }

      // Map campus names to IDs - FIXED to handle campus mapping properly
      const participantsWithCampusInfo = parseResult.data.map((participant) => {
        // Try to find campus by name (case insensitive)
        const campus = campuses.find(
          (c) =>
            c.name.toLowerCase() === participant.campus.toLowerCase() ||
            c.abbreviation.toLowerCase() === participant.campus.toLowerCase(),
        )

        return {
          name: participant.name,
          campus: participant.campus,
          campus_id: campus?.id, // This can be undefined, which is fine
        }
      })

      // Insert participants to database
      const { data: insertedData, error: insertError } =
        await dbHelpers.bulkInsertParticipants(participantsWithCampusInfo)

      if (insertError) throw insertError

      // Generate barcodes for all imported participants
      if (insertedData && insertedData.length > 0) {
        toast({
          title: "Generating Codes",
          description: `Membuat QR Code dan Barcode untuk ${insertedData.length} peserta...`,
        })
      }

      setImportResult({
        show: true,
        success: true,
        message: `Berhasil mengimport ${insertedData?.length || 0} peserta`,
        details: [
          `Format terdeteksi: ${parseResult.format.toUpperCase()}`,
          `Data berhasil disimpan: ${insertedData?.length || 0} peserta`,
          `QR Code dan Barcode otomatis dibuat untuk setiap peserta`,
          ...(insertedData?.slice(0, 3).map((p: any) => `- ${p.participant_number}: ${p.name}`) || []),
          ...((insertedData?.length || 0) > 3 ? [`... dan ${(insertedData?.length || 0) - 3} peserta lainnya`] : []),
        ],
      })

      fetchData()
    } catch (error: any) {
      setImportResult({
        show: true,
        success: false,
        message: "Gagal mengimport data",
        details: [error.message || "Terjadi kesalahan saat memproses file"],
      })
    }
  }

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newParticipant.campus_id) {
      toast({
        title: "Error",
        description: "Silakan pilih kampus",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await dbHelpers.addParticipant({
        name: newParticipant.name,
        campus: newParticipant.campus,
        campus_id: newParticipant.campus_id,
      })

      if (error) throw error

      const participantNumber = data?.[0]?.participant_number

      toast({
        title: "Berhasil",
        description: `Peserta berhasil ditambahkan dengan nomor ${participantNumber}`,
      })

      // Show code generation success
      if (participantNumber) {
        toast({
          title: "Codes Generated",
          description: `QR Code dan Barcode untuk ${participantNumber} siap untuk didownload`,
        })
      }

      setNewParticipant({ name: "", campus: "", campus_id: "" })
      setShowAddDialog(false)
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menambahkan peserta",
        variant: "destructive",
      })
    }
  }

  const toggleAttendance = async (participantId: string, currentStatus: boolean) => {
    try {
      const { data, error } = await dbHelpers.updateAttendance(participantId, !currentStatus)

      if (error) throw error

      toast({
        title: "Berhasil",
        description: `Status kehadiran berhasil ${!currentStatus ? "diaktifkan" : "dinonaktifkan"}`,
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengubah status kehadiran",
        variant: "destructive",
      })
    }
  }

  const handleCampusChange = (campusId: string) => {
    const selectedCampus = campuses.find((c) => c.id === campusId)
    setNewParticipant({
      ...newParticipant,
      campus_id: campusId,
      campus: selectedCampus?.name || "",
    })
  }

  const handleEditParticipant = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingParticipant || !editingParticipant.name.trim() || !editingParticipant.campus_id) {
      toast({
        title: "Error",
        description: "Nama dan kampus harus diisi",
        variant: "destructive",
      })
      return
    }

    try {
      const selectedCampus = campuses.find((c) => c.id === editingParticipant.campus_id)

      const { data, error } = await dbHelpers.updateParticipant(editingParticipant.id, {
        name: editingParticipant.name.trim(),
        campus: selectedCampus?.name || editingParticipant.campus,
        campus_id: editingParticipant.campus_id,
      })

      if (error) throw error

      toast({
        title: "Berhasil",
        description: "Data peserta berhasil diperbarui",
      })

      setEditingParticipant(null)
      setShowEditDialog(false)
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui data peserta",
        variant: "destructive",
      })
    }
  }

  const handleDeleteParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus peserta "${participantName}"?`)) {
      return
    }

    try {
      const { error } = await dbHelpers.deleteParticipant(participantId)

      if (error) throw error

      toast({
        title: "Berhasil",
        description: "Peserta berhasil dihapus",
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus peserta",
        variant: "destructive",
      })
    }
  }

  const handleShowCodes = (participant: Participant) => {
    setSelectedParticipant(participant)
    setShowCodeModal(true)
  }

  const openEditDialog = (participant: Participant) => {
    setEditingParticipant({ ...participant })
    setShowEditDialog(true)
  }

  const handleEditCampusChange = (campusId: string) => {
    if (!editingParticipant) return

    const selectedCampus = campuses.find((c) => c.id === campusId)
    setEditingParticipant({
      ...editingParticipant,
      campus_id: campusId,
      campus: selectedCampus?.name || "",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  const downloadCSVTemplate = () => {
    // CSV format with comma separator - FIXED template with proper campus names
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
    // Create Excel-compatible CSV data - FIXED template with proper campus names
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

    // Import the generateExcelFile function
    import("@/lib/excel-generator").then(({ generateExcelFile }) => {
      generateExcelFile(excelData, "template_peserta_parheheon_excel.csv")

      toast({
        title: "Template Excel Downloaded",
        description: "Template Excel-compatible CSV berhasil didownload",
      })
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Kelola Peserta</h1>
        <p className="text-gray-600">
          Import data peserta dan kelola informasi peserta dengan QR Code & Barcode otomatis
        </p>
      </div>

      {/* Import Result Dialog */}
      {importResult.show && (
        <Card
          className={`shadow-md border-2 ${importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${importResult.success ? "text-green-900" : "text-red-900"}`}>
                  {importResult.message}
                </h4>
                {importResult.details && (
                  <ul className={`mt-2 text-sm ${importResult.success ? "text-green-700" : "text-red-700"} space-y-1`}>
                    {importResult.details.map((detail, index) => (
                      <li key={index} className="break-words">
                        • {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportResult({ show: false, success: false, message: "" })}
                className="flex-shrink-0"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Cards - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Data Card */}
        <Card className="shadow-md">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-700">
              <Upload className="h-5 w-5 flex-shrink-0" />
              <span>Import Data Excel/CSV</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Upload file Excel atau CSV untuk menambahkan peserta secara massal dengan QR Code & Barcode otomatis
            </p>
            <div className="space-y-4">
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Upload className="h-4 w-4 mr-2" />
                Pilih File Excel/CSV
              </Button>
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full border-blue-600 text-blue-700 bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-4">
                  <DialogHeader>
                    <DialogTitle>Download Template Import</DialogTitle>
                    <DialogDescription>Pilih format template yang ingin Anda download</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Template Options */}
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        onClick={() => {
                          downloadCSVTemplate()
                          setShowTemplateDialog(false)
                        }}
                        variant="outline"
                        className="h-auto p-4 flex items-center gap-3 justify-start bg-green-50 border-green-200 hover:bg-green-100"
                      >
                        <FileText className="h-8 w-8 text-green-600 flex-shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="font-medium text-green-800">Template CSV</div>
                          <div className="text-xs text-green-600">Format standar dengan separator koma (,)</div>
                          <div className="text-xs text-gray-500 mt-1">Compatible: Google Sheets, LibreOffice</div>
                        </div>
                      </Button>

                      <Button
                        onClick={() => {
                          downloadExcelTemplate()
                          setShowTemplateDialog(false)
                        }}
                        variant="outline"
                        className="h-auto p-4 flex items-center gap-3 justify-start bg-blue-50 border-blue-200 hover:bg-blue-100"
                      >
                        <FileSpreadsheet className="h-8 w-8 text-blue-600 flex-shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="font-medium text-blue-800">Template Excel</div>
                          <div className="text-xs text-blue-600">CSV dengan format Excel (separator ;)</div>
                          <div className="text-xs text-gray-500 mt-1">Compatible: Microsoft Excel, WPS Office</div>
                        </div>
                      </Button>
                    </div>

                    {/* Info Section */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-yellow-700 min-w-0">
                          <p className="font-medium mb-1">Petunjuk:</p>
                          <ul className="space-y-1">
                            <li>• Jangan mengubah nama kolom header</li>
                            <li>• Pastikan nomor peserta unik</li>
                            <li>• Gunakan nama kampus yang sesuai dengan data sistem</li>
                            <li>• QR Code & Barcode akan otomatis dibuat untuk setiap peserta</li>
                            <li>• Simpan file dan upload kembali</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Add Manual Card */}
        <Card className="shadow-md">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-700">
              <UserPlus className="h-5 w-5 flex-shrink-0" />
              <span>Tambah Peserta Manual</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Tambahkan peserta secara manual satu per satu dengan QR Code & Barcode otomatis
            </p>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Tambah Peserta Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="mx-4">
                <DialogHeader>
                  <DialogTitle>Tambah Peserta Baru</DialogTitle>
                  <DialogDescription>
                    Masukkan data peserta baru (QR Code & Barcode akan otomatis dibuat)
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddParticipant} className="space-y-4">
                  <div>
                    <Label htmlFor="campus">Kampus</Label>
                    <select
                      id="campus"
                      value={newParticipant.campus_id}
                      onChange={(e) => handleCampusChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Pilih Kampus</option>
                      {campuses.map((campus) => (
                        <option key={campus.id} value={campus.id}>
                          {campus.name} ({campus.abbreviation})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="name">Nama</Label>
                    <Input
                      id="name"
                      value={newParticipant.name}
                      onChange={(e) =>
                        setNewParticipant({
                          ...newParticipant,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Tambah Peserta + Generate QR & Barcode
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Participants List - Fully Responsive */}
      <Card className="shadow-md">
        <CardHeader className="bg-white border-b">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle className="text-lg font-bold text-blue-700">
              Daftar Peserta ({filteredParticipants.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <Input
                  placeholder="Cari peserta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-50 text-gray-900"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block lg:hidden">
            <div className="divide-y divide-gray-200">
              {filteredParticipants.map((participant, index) => (
                <div key={participant.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          {participant.participant_number}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm leading-tight">{participant.name}</h3>
                      <p className="text-xs text-gray-600 truncate">{participant.campus}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={participant.is_present ? "default" : "secondary"}
                          className={`text-xs ${participant.is_present ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {participant.is_present ? "Hadir" : "Belum Hadir"}
                        </Badge>
                        {participant.attended_at && (
                          <span className="text-xs text-gray-500">
                            {new Date(participant.attended_at).toLocaleDateString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShowCodes(participant)}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 text-xs"
                    >
                      <QrCode className="h-3 w-3 mr-1" />
                      QR & Barcode
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(participant)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteParticipant(participant.id, participant.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                    <Button
                      size="sm"
                      variant={participant.is_present ? "destructive" : "default"}
                      onClick={() => toggleAttendance(participant.id, participant.is_present)}
                      className={`text-xs ${
                        participant.is_present
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {participant.is_present ? "Batalkan" : "Hadirkan"}
                    </Button>
                  </div>
                </div>
              ))}

              {filteredParticipants.length === 0 && (
                <div className="p-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {searchQuery ? "Tidak ada peserta yang ditemukan" : "Belum ada peserta yang ditambahkan"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Table View - Responsive */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asal Kampus
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nomor Peserta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waktu Absen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredParticipants.map((participant, index) => (
                    <tr key={participant.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {participant.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{participant.campus}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {participant.participant_number}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={participant.is_present ? "default" : "secondary"}
                          className={
                            participant.is_present ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }
                        >
                          {participant.is_present ? "Hadir" : "Belum Hadir"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {participant.attended_at
                          ? new Date(participant.attended_at).toLocaleDateString("id-ID") +
                            " " +
                            new Date(participant.attended_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowCodes(participant)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="Lihat QR Code & Barcode"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(participant)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Peserta"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteParticipant(participant.id, participant.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Hapus Peserta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={participant.is_present ? "destructive" : "default"}
                          onClick={() => toggleAttendance(participant.id, participant.is_present)}
                          className={
                            participant.is_present
                              ? "bg-red-500 hover:bg-red-600 text-white"
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          }
                          title={participant.is_present ? "Batalkan Kehadiran" : "Tandai Hadir"}
                        >
                          {participant.is_present ? "Batalkan" : "Hadirkan"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty State for Desktop */}
              {filteredParticipants.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? "Tidak ada peserta yang ditemukan" : "Belum ada peserta"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery
                      ? "Coba ubah kata kunci pencarian Anda"
                      : "Mulai dengan menambahkan peserta baru atau import data dari Excel/CSV"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Tambah Peserta Pertama
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Edit Peserta</DialogTitle>
            <DialogDescription>Perbarui data peserta</DialogDescription>
          </DialogHeader>
          {editingParticipant && (
            <form onSubmit={handleEditParticipant} className="space-y-4">
              <div>
                <Label htmlFor="edit_campus">Kampus</Label>
                <select
                  id="edit_campus"
                  value={editingParticipant.campus_id || ""}
                  onChange={(e) => handleEditCampusChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Pilih Kampus</option>
                  {campuses.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name} ({campus.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit_name">Nama</Label>
                <Input
                  id="edit_name"
                  value={editingParticipant.name}
                  onChange={(e) =>
                    setEditingParticipant({
                      ...editingParticipant,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_participant_number">Nomor Peserta</Label>
                <Input
                  id="edit_participant_number"
                  value={editingParticipant.participant_number}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Nomor peserta tidak dapat diubah</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  Perbarui Peserta
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingParticipant(null)
                    setShowEditDialog(false)
                  }}
                >
                  Batal
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Code Display Modal */}
      {selectedParticipant && (
        <CodeDisplayModal
          isOpen={showCodeModal}
          onClose={() => {
            setShowCodeModal(false)
            setSelectedParticipant(null)
          }}
          participantNumber={selectedParticipant.participant_number}
          participantName={selectedParticipant.name}
        />
      )}
    </div>
  )
}
