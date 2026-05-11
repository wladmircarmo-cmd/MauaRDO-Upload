import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const os = searchParams.get("os");

  const admin = createSupabaseAdminClient();

  try {
    let query = admin
      .from("eap-tab")
      .select("WBS, Subtask, OS, Item, \"Cod Ativ\"")
      .not("WBS", "is", null)
      .not("OS", "is", null)
      .order("WBS");

    if (os) {
      query = query.eq("OS", os);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    return NextResponse.json(tasks || []);
  } catch (error: unknown) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
