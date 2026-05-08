import { NextResponse } from "next/server";
import { getWbsList } from "@/lib/wbs";

export function GET() {
  const wbs = getWbsList();
  return NextResponse.json({ wbs });
}
