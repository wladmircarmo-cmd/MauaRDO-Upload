import { NextResponse } from "next/server";
import { getExternalWbsList } from "@/lib/external-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const os = searchParams.get("os");
  const cc = searchParams.get("cc");

  console.log("Fetching tasks with params:", { os, cc });

  try {
    const tasks = await getExternalWbsList();

    console.log("External API tasks count:", tasks.length);
    console.log("Sample task:", tasks[0]);

    let filteredTasks = tasks;

    if (cc) {
      console.log("Filtering by cod_ccusto:", cc);
      filteredTasks = tasks.filter((t: any) => String(t.cod_ccusto) === cc);
    }

    if (os) {
      console.log("Filtering by OS:", os);
      filteredTasks = filteredTasks.filter((t: any) => String(t.OS || t.os) === os);
    }

    console.log("Filtered tasks count:", filteredTasks.length);
    console.log("Sample filtered task:", filteredTasks[0]);

    return NextResponse.json(filteredTasks || []);
  } catch (error: unknown) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
