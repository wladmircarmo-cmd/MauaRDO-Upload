import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createSupabaseAdminClient();

  try {
    // Fetch unique CCs
    const { data: ccs, error: ccError } = await admin
      .from("rdo_cc")
      .select("cc, descriçãocc")
      .order("cc");

    if (ccError) throw ccError;

    // Fetch unique OSs
    const { data: oss, error: osError } = await admin
      .from("eap-tab")
      .select("OS")
      .not("OS", "is", null)
      .order("OS");

    if (osError) throw osError;

    // Unique OS values
    const uniqueOss = Array.from(new Set(oss.map((item: any) => item.OS))).sort();

    return NextResponse.json({
      ccs: ccs || [],
      oss: uniqueOss,
    });
  } catch (error: any) {
    console.error("Error fetching options:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
