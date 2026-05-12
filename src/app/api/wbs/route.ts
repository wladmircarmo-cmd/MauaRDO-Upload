import { NextResponse } from "next/server";
import { getExternalWbsList } from "@/lib/external-api";

export async function GET() {
  try {
    const wbs = await getExternalWbsList();
    return NextResponse.json({ wbs });
  } catch (error) {
    console.error("Error fetching WBS from external API:", error);
    return NextResponse.json(
      { error: "Failed to fetch WBS data" },
      { status: 500 }
    );
  }
}
