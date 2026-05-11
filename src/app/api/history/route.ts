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

    const history = (data || []).map((item: {
      id_atividade: number | string;
      tarefa: string;
      comentario: string | null;
      rdo_os: {
        os: string;
        rdo: {
          cc: string;
          data_rdo: string;
        }[]
      }[];
      rdo_imagens: { id_imagem: number | string }[];
    }) => {
      const osData = item.rdo_os?.[0];
      const rdoData = osData?.rdo?.[0];

      return {
        id: String(item.id_atividade),
        data: rdoData?.data_rdo || "",
        cc: rdoData?.cc || "",
        os: osData?.os || "",
        rdo_atividades: [
          {
            wbs: item.tarefa,
            descricao: item.comentario ?? "",
          }
        ],
        rdo_imagens: [
          {
            count: item.rdo_imagens?.length || 0
          }
        ]
      };
    });

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
