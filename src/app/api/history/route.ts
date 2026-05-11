import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createSupabaseAdminClient();

  try {
    // We query from rdo_atividades because that represents a "task launched"
    const { data, error } = await admin
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
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // Map to the structure expected by the frontend
    const history = data.map((item: {
      id_atividade: number | string;
      tarefa: string;
      comentario: string | null;
      rdo_os: {
        os: string;
        rdo: {
          cc: string;
          data_rdo: string;
        }
      };
      rdo_imagens: { id_imagem: number | string }[];
    }) => ({
      id: String(item.id_atividade),
      data: item.rdo_os.rdo.data_rdo,
      cc: item.rdo_os.rdo.cc,
      os: item.rdo_os.os,
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
    }));

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ 
      error: "Erro ao buscar histórico",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
