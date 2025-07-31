import { dbHelpers } from "./supabase"

export async function testDatabaseConnection() {
  try {
    console.log("Testing database connection...")

    // Test basic connection by trying to fetch campuses
    const { data, error } = await dbHelpers.getCampuses()

    if (error) {
      console.error("Connection test failed:", error)
      return {
        success: false,
        message: "Database connection failed",
        details: error.message,
      }
    }

    console.log("Connection test successful, found", data?.length || 0, "campuses")

    return {
      success: true,
      message: "Database connected successfully",
      details: `Found ${data?.length || 0} campuses in database`,
    }
  } catch (error) {
    console.error("Connection test error:", error)
    return {
      success: false,
      message: "Connection test failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
