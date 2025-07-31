import { createClient } from "@supabase/supabase-js"

// Get environment variables - these should now be available from the connected database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Check if we have the required environment variables
const isConfigured =
  supabaseUrl && supabaseKey && supabaseUrl !== "https://preview-mode.supabase.co" && supabaseKey !== "preview-mode-key"

// Create Supabase client
const supabase = isConfigured ? createClient(supabaseUrl, supabaseKey) : null

console.log("Supabase configuration:", {
  url: supabaseUrl,
  keyLength: supabaseKey?.length,
  isConfigured,
})

const isPreviewMode = !isConfigured

// Type definitions
export interface Participant {
  id: string
  participant_number: string
  name: string
  campus: string
  campus_id?: string
  is_present: boolean
  attended_at: string | null
  created_at: string
  updated_at?: string
}

export interface Campus {
  id: string
  name: string
  abbreviation: string
  created_at: string
  updated_at?: string
}

export interface EventSettings {
  id: string
  event_name: string
  attendance_enabled: boolean
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  username: string
  password: string
  created_at: string
  updated_at?: string
}

// Mock data untuk preview mode - KOSONGKAN SEMUA
const mockCampuses: Campus[] = []
const mockParticipants: Participant[] = []

// Mock event settings - buat mutable untuk preview mode
let mockEventSettings = {
  id: "1",
  event_name: "Parheheon Naposo HKBP Riau 2025",
  attendance_enabled: true,
  created_at: "2025-01-28T08:00:00Z",
  updated_at: "2025-01-28T08:00:00Z",
}

// Helper function to generate next participant number
function generateNextParticipantNumber(campusAbbreviation: string): string {
  // Jika mock data kosong, mulai dari 01
  if (mockParticipants.length === 0) {
    return `${campusAbbreviation}01`
  }

  const existingNumbers = mockParticipants
    .filter((p) => p.participant_number.startsWith(campusAbbreviation))
    .map((p) => {
      const numberPart = p.participant_number.replace(campusAbbreviation, "")
      return Number.parseInt(numberPart, 10)
    })
    .filter((n) => !isNaN(n))

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${campusAbbreviation}${nextNumber.toString().padStart(2, "0")}`
}

// Database helper functions
export const dbHelpers = {
  // Get all participants with campus info
  async getParticipants() {
    if (isPreviewMode || !supabase) {
      console.log("Preview mode: Using dynamic mock data")
      return {
        data: mockParticipants.map((p) => ({
          ...p,
          campus_info: mockCampuses.find((c) => c.id === p.campus_id),
        })),
        error: null,
      }
    }

    console.log("Fetching participants from Supabase...")
    const { data, error } = await supabase
      .from("participants")
      .select(`
        *,
        campuses(id, name, abbreviation)
      `)
      .order("created_at", { ascending: false })

    console.log("Participants query result:", { data, error })
    return { data, error }
  },

  // Get participant by number
  async getParticipantByNumber(participantNumber: string) {
    if (isPreviewMode || !supabase) {
      console.log("Using mock data for participant lookup")
      const participant = mockParticipants.find((p) => p.participant_number === participantNumber.toUpperCase())
      return {
        data: participant
          ? {
              ...participant,
              campus_info: mockCampuses.find((c) => c.id === participant.campus_id),
            }
          : null,
        error: participant ? null : { message: "Participant not found" },
      }
    }

    console.log("Fetching participant from Supabase:", participantNumber)
    const { data, error } = await supabase
      .from("participants")
      .select(`
        *,
        campuses(id, name, abbreviation)
      `)
      .eq("participant_number", participantNumber.toUpperCase())
      .single()

    console.log("Participant query result:", { data, error })
    return { data, error }
  },

  // Get all campuses
  async getCampuses() {
    if (isPreviewMode || !supabase) {
      // Jika mock kosong, populate dengan data default minimal
      if (mockCampuses.length === 0) {
        const defaultCampuses = [
          { id: "1", name: "Universitas Indonesia", abbreviation: "UI", created_at: new Date().toISOString() },
          { id: "2", name: "Institut Teknologi Bandung", abbreviation: "ITB", created_at: new Date().toISOString() },
          { id: "3", name: "Universitas Gadjah Mada", abbreviation: "UGM", created_at: new Date().toISOString() },
        ]
        mockCampuses.push(...defaultCampuses)
      }
      return { data: mockCampuses, error: null }
    }

    const { data, error } = await supabase.from("campuses").select("*").order("name", { ascending: true })
    return { data, error }
  },

  // Add new participant
  async addParticipant(participant: {
    name: string
    campus: string
    campus_id?: string
  }) {
    if (isPreviewMode || !supabase) {
      const campus = mockCampuses.find((c) => c.id === participant.campus_id)
      if (!campus) {
        return { data: null, error: { message: "Campus not found" } }
      }

      const participantNumber = generateNextParticipantNumber(campus.abbreviation)
      const newParticipant = {
        id: Date.now().toString(),
        participant_number: participantNumber,
        name: participant.name,
        campus: participant.campus,
        campus_id: participant.campus_id,
        is_present: false,
        attended_at: null,
        created_at: new Date().toISOString(),
      }

      mockParticipants.push(newParticipant)
      return { data: [newParticipant], error: null }
    }

    const insertData: any = {
      name: participant.name.trim(),
      campus: participant.campus.trim(),
    }

    if (participant.campus_id && participant.campus_id.trim() !== "") {
      insertData.campus_id = participant.campus_id
    }

    console.log("Inserting participant:", insertData)

    const { data, error } = await supabase.from("participants").insert([insertData]).select()

    console.log("Insert result:", { data, error })
    return { data, error }
  },

  // Update participant attendance - COMPLETELY REWRITTEN to avoid trigger issues
  async updateAttendance(participantId: string, isPresent: boolean) {
    if (isPreviewMode || !supabase) {
      const participantIndex = mockParticipants.findIndex((p) => p.id === participantId)
      if (participantIndex === -1) {
        return { data: null, error: { message: "Participant not found" } }
      }

      mockParticipants[participantIndex] = {
        ...mockParticipants[participantIndex],
        is_present: isPresent,
        attended_at: isPresent ? new Date().toISOString() : null,
      }

      return { data: [mockParticipants[participantIndex]], error: null }
    }

    console.log("=== ATTENDANCE UPDATE START ===")
    console.log("Participant ID:", participantId)
    console.log("Setting present to:", isPresent)

    try {
      // Step 1: Verify participant exists
      const { data: existingParticipant, error: fetchError } = await supabase
        .from("participants")
        .select("id, participant_number, name, is_present")
        .eq("id", participantId)
        .single()

      if (fetchError) {
        console.error("Error fetching participant:", fetchError)
        return { data: null, error: fetchError }
      }

      if (!existingParticipant) {
        console.error("Participant not found")
        return { data: null, error: { message: "Participant not found" } }
      }

      console.log("Found participant:", existingParticipant)

      // Step 2: Prepare update data - ONLY the essential fields
      const updateData: any = {
        is_present: isPresent,
        attended_at: isPresent ? new Date().toISOString() : null,
      }

      console.log("Update data:", updateData)

      // Step 3: Perform the update with explicit error handling
      const { data: updateResult, error: updateError } = await supabase
        .from("participants")
        .update(updateData)
        .eq("id", participantId)
        .select("id, participant_number, name, is_present, attended_at")

      console.log("Update result:", { data: updateResult, error: updateError })

      if (updateError) {
        console.error("Update failed:", updateError)
        return { data: null, error: updateError }
      }

      console.log("=== ATTENDANCE UPDATE SUCCESS ===")
      return { data: updateResult, error: null }
    } catch (exception) {
      console.error("=== ATTENDANCE UPDATE EXCEPTION ===")
      console.error("Exception details:", exception)

      return {
        data: null,
        error: {
          message: exception instanceof Error ? exception.message : "Unknown error during attendance update",
          details: exception,
        },
      }
    }
  },

  // Get event settings
  async getEventSettings() {
    if (isPreviewMode || !supabase) {
      return {
        data: mockEventSettings,
        error: null,
      }
    }

    const { data, error } = await supabase.from("event_settings").select("*").single()
    return { data, error }
  },

  // Update event settings
  async updateEventSettings(settings: {
    event_name?: string
    attendance_enabled?: boolean
  }) {
    if (isPreviewMode || !supabase) {
      mockEventSettings = {
        ...mockEventSettings,
        ...settings,
        updated_at: new Date().toISOString(),
      }
      return {
        data: mockEventSettings,
        error: null,
      }
    }

    const { data: existingData, error: fetchError } = await supabase.from("event_settings").select("*").limit(1)

    if (fetchError) {
      console.error("Error fetching event settings:", fetchError)
      return { data: null, error: fetchError }
    }

    if (!existingData || existingData.length === 0) {
      const newSettings = {
        event_name: settings.event_name || "Parheheon Naposo HKBP Riau 2025",
        attendance_enabled: settings.attendance_enabled ?? true,
      }

      const { data, error } = await supabase.from("event_settings").insert([newSettings]).select().single()
      return { data, error }
    } else {
      const { data, error } = await supabase
        .from("event_settings")
        .update(settings)
        .eq("id", existingData[0].id)
        .select()
        .single()

      return { data, error }
    }
  },

  // Admin login
  async adminLogin(username: string, password: string) {
    if (isPreviewMode || !supabase) {
      console.log("Using mock admin login")
      if (username === "admin" && password === "admin123") {
        return {
          data: {
            id: "1",
            username: "admin",
            password: "admin123",
            created_at: "2025-01-28T08:00:00Z",
          },
          error: null,
        }
      }
      return { data: null, error: { message: "Invalid credentials" } }
    }

    console.log("Authenticating admin with Supabase:", username)
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single()

    console.log("Admin login result:", { data: data ? "found" : "not found", error })
    return { data, error }
  },

  // Add campus
  async addCampus(campus: {
    name: string
    abbreviation: string
  }) {
    if (isPreviewMode || !supabase) {
      const newCampus = {
        id: Date.now().toString(),
        name: campus.name,
        abbreviation: campus.abbreviation.toUpperCase(),
        created_at: new Date().toISOString(),
      }
      mockCampuses.push(newCampus)
      return { data: [newCampus], error: null }
    }

    const { data, error } = await supabase
      .from("campuses")
      .insert([
        {
          ...campus,
          abbreviation: campus.abbreviation.toUpperCase(),
        },
      ])
      .select()

    return { data, error }
  },

  // Update campus
  async updateCampus(
    id: string,
    campus: {
      name: string
      abbreviation: string
    },
  ) {
    if (isPreviewMode || !supabase) {
      const campusIndex = mockCampuses.findIndex((c) => c.id === id)
      if (campusIndex === -1) {
        return { data: null, error: { message: "Campus not found" } }
      }

      mockCampuses[campusIndex] = {
        ...mockCampuses[campusIndex],
        name: campus.name,
        abbreviation: campus.abbreviation.toUpperCase(),
        updated_at: new Date().toISOString(),
      }

      return { data: [mockCampuses[campusIndex]], error: null }
    }

    const { data, error } = await supabase
      .from("campuses")
      .update({
        ...campus,
        abbreviation: campus.abbreviation.toUpperCase(),
      })
      .eq("id", id)
      .select()

    return { data, error }
  },

  // Delete campus
  async deleteCampus(id: string) {
    if (isPreviewMode || !supabase) {
      const campusIndex = mockCampuses.findIndex((c) => c.id === id)
      if (campusIndex === -1) {
        return { data: null, error: { message: "Campus not found" } }
      }

      mockCampuses.splice(campusIndex, 1)
      return { data: null, error: null }
    }

    const { data, error } = await supabase.from("campuses").delete().eq("id", id)
    return { data, error }
  },

  // Bulk insert participants
  async bulkInsertParticipants(
    participants: Array<{
      name: string
      campus: string
      campus_id?: string
    }>,
  ) {
    if (isPreviewMode || !supabase) {
      const newParticipants = participants.map((p) => {
        const campus = mockCampuses.find((c) => c.id === p.campus_id || c.name === p.campus)
        const participantNumber = campus ? generateNextParticipantNumber(campus.abbreviation) : `UNK${Date.now()}`

        const newParticipant = {
          id: Date.now().toString() + Math.random().toString(),
          participant_number: participantNumber,
          name: p.name,
          campus: p.campus,
          campus_id: campus?.id,
          is_present: false,
          attended_at: null,
          created_at: new Date().toISOString(),
        }

        mockParticipants.push(newParticipant)
        return newParticipant
      })

      return { data: newParticipants, error: null }
    }

    const insertData = participants.map((p) => {
      const insertItem: any = {
        name: p.name.trim(),
        campus: p.campus.trim(),
      }

      if (p.campus_id && p.campus_id.trim() !== "") {
        insertItem.campus_id = p.campus_id
      }

      return insertItem
    })

    console.log("Bulk inserting participants:", insertData.length, "items")

    const { data, error } = await supabase.from("participants").insert(insertData).select()

    console.log("Bulk insert result:", {
      success: !error,
      count: data?.length || 0,
      error: error?.message,
    })

    return { data, error }
  },

  // Update participant
  async updateParticipant(
    id: string,
    participant: {
      name: string
      campus: string
      campus_id?: string
    },
  ) {
    if (isPreviewMode || !supabase) {
      const participantIndex = mockParticipants.findIndex((p) => p.id === id)
      if (participantIndex === -1) {
        return { data: null, error: { message: "Participant not found" } }
      }

      mockParticipants[participantIndex] = {
        ...mockParticipants[participantIndex],
        name: participant.name,
        campus: participant.campus,
        campus_id: participant.campus_id,
        updated_at: new Date().toISOString(),
      }

      return { data: [mockParticipants[participantIndex]], error: null }
    }

    const updateData: any = {
      name: participant.name.trim(),
      campus: participant.campus.trim(),
    }

    if (participant.campus_id && participant.campus_id.trim() !== "") {
      updateData.campus_id = participant.campus_id
    }

    console.log("Updating participant:", id, updateData)

    const { data, error } = await supabase.from("participants").update(updateData).eq("id", id).select()

    console.log("Update result:", { data, error })
    return { data, error }
  },

  // Delete participant
  async deleteParticipant(id: string) {
    if (isPreviewMode || !supabase) {
      const participantIndex = mockParticipants.findIndex((p) => p.id === id)
      if (participantIndex === -1) {
        return { data: null, error: { message: "Participant not found" } }
      }

      mockParticipants.splice(participantIndex, 1)
      return { data: null, error: null }
    }

    console.log("Deleting participant:", id)

    const { data, error } = await supabase.from("participants").delete().eq("id", id)

    console.log("Delete result:", { data, error })
    return { data, error }
  },

  // Generate next participant number for campus
  async generateParticipantNumber(campusAbbreviation: string) {
    if (isPreviewMode || !supabase) {
      return { data: generateNextParticipantNumber(campusAbbreviation.toUpperCase()), error: null }
    }

    const { data, error } = await supabase.rpc("generate_participant_number", {
      campus_abbrev: campusAbbreviation.toUpperCase(),
    })

    return { data, error }
  },
}

// Connection test function
export async function testConnection() {
  if (isPreviewMode || !supabase) {
    console.log("Running in preview mode - Supabase not configured")
    return true
  }

  try {
    const { data, error } = await supabase.from("campuses").select("*", { count: "exact", head: true })

    if (error) {
      console.error("Supabase connection error:", error)
      return false
    }

    console.log("Supabase connected successfully!")
    return true
  } catch (error) {
    console.error("Supabase connection failed:", error)
    return false
  }
}

// Export the supabase client and preview mode status
export { supabase, isPreviewMode }
