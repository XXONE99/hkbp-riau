"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { dbHelpers, type Campus } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { GraduationCap, Plus, Search, Edit, Trash2 } from "lucide-react"

export function AdminCampus() {
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [filteredCampuses, setFilteredCampuses] = useState<Campus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null)
  const [newCampus, setNewCampus] = useState({
    name: "",
    abbreviation: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCampuses(campuses)
    } else {
      const filtered = campuses.filter(
        (campus) =>
          campus.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campus.abbreviation.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredCampuses(filtered)
    }
  }, [campuses, searchQuery])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data, error } = await dbHelpers.getCampuses()

      if (error) throw error
      setCampuses(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data kampus",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCampus.name.trim() || !newCampus.abbreviation.trim()) {
      toast({
        title: "Error",
        description: "Nama kampus dan singkatan harus diisi",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await dbHelpers.addCampus({
        name: newCampus.name.trim(),
        abbreviation: newCampus.abbreviation.trim(),
      })

      if (error) throw error

      toast({
        title: "Berhasil",
        description: "Kampus berhasil ditambahkan",
      })

      setNewCampus({ name: "", abbreviation: "" })
      setShowAddDialog(false)
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menambahkan kampus",
        variant: "destructive",
      })
    }
  }

  const handleEditCampus = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingCampus || !editingCampus.name.trim() || !editingCampus.abbreviation.trim()) {
      toast({
        title: "Error",
        description: "Nama kampus dan singkatan harus diisi",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await dbHelpers.updateCampus(editingCampus.id, {
        name: editingCampus.name.trim(),
        abbreviation: editingCampus.abbreviation.trim(),
      })

      if (error) throw error

      toast({
        title: "Berhasil",
        description: "Kampus berhasil diperbarui",
      })

      setEditingCampus(null)
      setShowEditDialog(false)
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui kampus",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCampus = async (campusId: string, campusName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kampus "${campusName}"?`)) {
      return
    }

    try {
      const { error } = await dbHelpers.deleteCampus(campusId)

      if (error) throw error

      toast({
        title: "Berhasil",
        description: "Kampus berhasil dihapus",
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus kampus",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (campus: Campus) => {
    setEditingCampus({ ...campus })
    setShowEditDialog(true)
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Kelola Kampus</h1>
        <p className="text-gray-600">Kelola data kampus dan singkatannya untuk standardisasi data peserta</p>
      </div>

      {/* Add Campus Card */}
      <Card className="shadow-md">
        <CardHeader className="bg-white border-b">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-700">
            <GraduationCap className="h-5 w-5 flex-shrink-0" />
            <span>Tambah Kampus Baru</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600 mb-4">Tambahkan kampus baru untuk standardisasi data peserta</p>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Kampus Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 sm:mx-0">
              <DialogHeader>
                <DialogTitle>Tambah Kampus Baru</DialogTitle>
                <DialogDescription>Masukkan data kampus baru</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCampus} className="space-y-4">
                <div>
                  <Label htmlFor="campus_name">Nama Kampus</Label>
                  <Input
                    id="campus_name"
                    value={newCampus.name}
                    onChange={(e) =>
                      setNewCampus({
                        ...newCampus,
                        name: e.target.value,
                      })
                    }
                    placeholder="Universitas Indonesia"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="campus_abbreviation">Singkatan Kampus</Label>
                  <Input
                    id="campus_abbreviation"
                    value={newCampus.abbreviation}
                    onChange={(e) =>
                      setNewCampus({
                        ...newCampus,
                        abbreviation: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="UI"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Tambah Kampus
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Campus List */}
      <Card className="shadow-md">
        <CardHeader className="bg-white border-b">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle className="text-lg font-bold text-blue-700">Daftar Kampus ({filteredCampuses.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <Input
                placeholder="Cari kampus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-50 text-gray-900"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block lg:hidden">
            <div className="divide-y divide-gray-200">
              {filteredCampuses.map((campus, index) => (
                <div key={campus.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          {campus.abbreviation}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm leading-tight">{campus.name}</h3>
                      <p className="text-xs text-gray-500">
                        Dibuat: {new Date(campus.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(campus)}
                      className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCampus(campus.id, campus.name)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}

              {filteredCampuses.length === 0 && (
                <div className="p-8 text-center">
                  <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {searchQuery ? "Tidak ada kampus yang ditemukan" : "Belum ada kampus yang ditambahkan"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Kampus
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Singkatan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Dibuat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCampuses.map((campus, index) => (
                    <tr key={campus.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{campus.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {campus.abbreviation}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(campus.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(campus)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCampus(campus.id, campus.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty State for Desktop */}
              {filteredCampuses.length === 0 && (
                <div className="text-center py-12">
                  <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? "Tidak ada kampus yang ditemukan" : "Belum ada kampus"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery
                      ? "Coba ubah kata kunci pencarian Anda"
                      : "Mulai dengan menambahkan kampus baru untuk sistem absensi"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Kampus Pertama
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
        <DialogContent className="mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Edit Kampus</DialogTitle>
            <DialogDescription>Perbarui data kampus</DialogDescription>
          </DialogHeader>
          {editingCampus && (
            <form onSubmit={handleEditCampus} className="space-y-4">
              <div>
                <Label htmlFor="edit_campus_name">Nama Kampus</Label>
                <Input
                  id="edit_campus_name"
                  value={editingCampus.name}
                  onChange={(e) =>
                    setEditingCampus({
                      ...editingCampus,
                      name: e.target.value,
                    })
                  }
                  placeholder="Universitas Indonesia"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_campus_abbreviation">Singkatan Kampus</Label>
                <Input
                  id="edit_campus_abbreviation"
                  value={editingCampus.abbreviation}
                  onChange={(e) =>
                    setEditingCampus({
                      ...editingCampus,
                      abbreviation: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="UI"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  Perbarui Kampus
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingCampus(null)
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
    </div>
  )
}
