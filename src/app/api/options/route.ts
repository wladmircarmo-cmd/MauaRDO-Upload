import { NextResponse } from "next/server";
import { getExternalOptions } from "@/lib/external-api";

export async function GET() {
  try {
    const { ccs, oss } = await getExternalOptions();
    
    return NextResponse.json({
      ccs: ccs || [],
      oss: oss || [],
    });
  } catch (error: unknown) {
    console.error("Error fetching options from external API:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
