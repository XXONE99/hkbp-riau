// Utility untuk generate nomor peserta berdasarkan kampus

export interface Campus {
  id: string
  name: string
  abbreviation: string
}

export interface Participant {
  id: string
  participant_number: string
  name: string
  campus: string
  is_present: boolean
  attended_at: string | null
  created_at: string
}

// Generate nomor peserta berikutnya untuk kampus tertentu
export function generateParticipantNumber(campusAbbreviation: string, existingParticipants: Participant[]): string {
  // Filter peserta yang dari kampus yang sama
  const campusParticipants = existingParticipants.filter((p) =>
    p.participant_number.startsWith(campusAbbreviation.toUpperCase()),
  )

  // Cari nomor tertinggi yang sudah ada
  let highestNumber = 0
  campusParticipants.forEach((participant) => {
    const numberPart = participant.participant_number.replace(campusAbbreviation.toUpperCase(), "")
    const number = Number.parseInt(numberPart, 10)
    if (!isNaN(number) && number > highestNumber) {
      highestNumber = number
    }
  })

  // Generate nomor berikutnya dengan format 2 digit (01, 02, dst)
  const nextNumber = highestNumber + 1
  const formattedNumber = nextNumber.toString().padStart(2, "0")

  return `${campusAbbreviation.toUpperCase()}${formattedNumber}`
}

// Validasi format nomor peserta
export function validateParticipantNumber(participantNumber: string, campusAbbreviation: string): boolean {
  const expectedPrefix = campusAbbreviation.toUpperCase()
  const regex = new RegExp(`^${expectedPrefix}\\d{2,}$`)
  return regex.test(participantNumber)
}

// Extract campus abbreviation dari nomor peserta
export function extractCampusFromParticipantNumber(participantNumber: string): string {
  // Ambil bagian huruf di awal nomor peserta
  const match = participantNumber.match(/^([A-Z]+)/)
  return match ? match[1] : ""
}

// Generate batch nomor peserta untuk import
export function generateBatchParticipantNumbers(
  participantsData: Array<{ name: string; campus: string; campusAbbreviation: string }>,
  existingParticipants: Participant[],
): Array<{ name: string; campus: string; participant_number: string }> {
  const result: Array<{ name: string; campus: string; participant_number: string }> = []
  const tempExisting = [...existingParticipants]

  // Group by campus untuk efisiensi
  const groupedByCampus = participantsData.reduce(
    (acc, participant) => {
      const abbrev = participant.campusAbbreviation.toUpperCase()
      if (!acc[abbrev]) {
        acc[abbrev] = []
      }
      acc[abbrev].push(participant)
      return acc
    },
    {} as Record<string, typeof participantsData>,
  )

  // Generate nomor untuk setiap kampus
  Object.entries(groupedByCampus).forEach(([abbreviation, participants]) => {
    participants.forEach((participant) => {
      const participantNumber = generateParticipantNumber(abbreviation, tempExisting)

      result.push({
        name: participant.name,
        campus: participant.campus,
        participant_number: participantNumber,
      })

      // Tambahkan ke temporary existing untuk mencegah duplikasi dalam batch yang sama
      tempExisting.push({
        id: Date.now().toString() + Math.random(),
        participant_number: participantNumber,
        name: participant.name,
        campus: participant.campus,
        is_present: false,
        attended_at: null,
        created_at: new Date().toISOString(),
      })
    })
  })

  return result
}
