import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const admin = createSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const { data, error, count } = await admin
      .from("rdo_atividades")
      .select(`
        id_atividade,
        tarefa,
        comentario,
        rdo_os!inner (
          os,
          rdo!inner (
            cc,
            data_rdo
          )
        ),
        rdo_imagens (
          id_imagem
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    interface HistoryGroup {
      id: string;
      data: string;
      cc: string;
      os: string;
      atividades: { wbs: string; descricao: string; fotos: number }[];
      totalFotos: number;
    }

    // Group activities by OS + Date + CC
    const groupedMap = new Map<string, HistoryGroup>();

    (data || []).forEach((item: any) => {
      const osData = Array.isArray(item.rdo_os) ? item.rdo_os[0] : item.rdo_os;
      const rdoData = osData && Array.isArray(osData.rdo) ? osData.rdo[0] : osData?.rdo;
      
      if (!osData || !rdoData) return;

      const groupKey = `${osData.os}-${rdoData.data_rdo}-${rdoData.cc}`;
      
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          id: groupKey,
          data: rdoData.data_rdo,
          cc: rdoData.cc,
          os: osData.os,
          atividades: [],
          totalFotos: 0
        });
      }

      const group = groupedMap.get(groupKey);
      if (!group) return;
      
      // Check if this specific task (WBS + Comment) already exists in this group
      const ativKey = `${item.tarefa}-${item.comentario || ""}`;
      const existingAtiv = group.atividades.find((a) => `${a.wbs}-${a.descricao}` === ativKey);
      
      const fotoCount = item.rdo_imagens?.length || 0;
      
      if (existingAtiv) {
        existingAtiv.fotos += fotoCount;
      } else {
        group.atividades.push({
          wbs: item.tarefa,
          descricao: item.comentario || "",
          fotos: fotoCount
        });
      }
      group.totalFotos += fotoCount;
    });

    const history = Array.from(groupedMap.values()).map(group => ({
      id: group.id,
      data: group.data,
      cc: group.cc,
      os: group.os,
      rdo_atividades: group.atividades, // Now contains multiple activities
      totalFotos: group.totalFotos // Sum of all images in this OS group
    }));

    return NextResponse.json({ 
      history, 
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ 
      error: "Erro ao buscar histórico",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
