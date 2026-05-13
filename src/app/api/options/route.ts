import { NextResponse } from "next/server";
import { getExternalOptions } from "@/lib/external-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;
  const type = (searchParams.get("type") as 'start' | 'end' | 'active') || 'active';

  try {
    const { ccs, oss } = await getExternalOptions(date, type);
    
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
