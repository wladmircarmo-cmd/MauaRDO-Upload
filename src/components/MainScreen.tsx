"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { MAX_IMAGE_BYTES, normalizeWbs } from "@/lib/upload/validation";
import type { WbsEntry } from "@/lib/wbs";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function MainScreen() {
  const [wbs, setWbs] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [cc, setCc] = useState<string>("");
  const [os, setOs] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [wbsList, setWbsList] = useState<WbsEntry[]>([]);
  const [wbsLoading, setWbsLoading] = useState(true);
  const [wbsError, setWbsError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);


  useEffect(() => {
    async function loadWbs() {
      try {
        const response = await fetch("/api/wbs");
        if (!response.ok) {
          throw new Error("Falha ao carregar lista de WBS.");
        }
        const json = await response.json();
        const list = Array.isArray(json.wbs) ? json.wbs : [];
        const entries: WbsEntry[] = list.map((item: unknown) => {
          if (typeof item === "string") {
            return { wbs: item };
          }

          if (typeof item === "object" && item !== null && "wbs" in item) {
            const entry = item as { wbs: unknown; parent_task_path?: unknown };
            return {
              wbs: String(entry.wbs),
              parent_task_path:
                typeof entry.parent_task_path === "string"
                  ? entry.parent_task_path
                  : undefined,
            };
          }

          return { wbs: String(item) };
        });
        setWbsList(entries);
        if (entries.length > 0) {
          setWbs(entries[0].wbs);
        }
      } catch (error) {
        setWbsError(error instanceof Error ? error.message : String(error));
      } finally {
        setWbsLoading(false);
      }
    }

    loadWbs();
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const next = [...prev, ...accepted].slice(0, 4);
      return next;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: true,
    maxFiles: 4,
    noClick: true,
    accept: { "image/*": [] },
  });

  const normalizedWbs = useMemo(() => normalizeWbs(wbs), [wbs]);

  const compressInBrowser = useCallback(async (input: File) => {
    const compressed = await imageCompression(input, {
      maxWidthOrHeight: 1920,
      initialQuality: 0.8,
      useWebWorker: true,
      maxSizeMB: 10,
    });
    return compressed;
  }, []);

  const submit = useCallback(async () => {
    if (files.length === 0) {
      setStatus({ kind: "error", message: "Selecione pelo menos uma imagem." });
      return;
    }
    if (!wbs) {
      setStatus({ kind: "error", message: "Selecione um WBS." });
      return;
    }

    try {
      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const progress = files.length > 1 ? ` (${i + 1}/${files.length})` : "";
        
        if (currentFile.size > MAX_IMAGE_BYTES) {
          setStatus({ kind: "error", message: `Arquivo ${i + 1} excede 10MB.` });
          return;
        }

        setStatus({ kind: "loading", message: `Comprimindo imagem${progress}...` });
        const compressed = await compressInBrowser(currentFile);

        setStatus({ kind: "loading", message: `Enviando${progress}...` });
        const form = new FormData();
        form.set("file", compressed);
        form.set("wbs", wbs);
        form.set("description", description);
        form.set("cc", cc);
        form.set("os", os);
        form.set("date", date);

        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = (await res.json().catch(() => null)) as
          | null
          | { error?: unknown; supabase_path?: unknown };

        if (!res.ok) {
          setStatus({
            kind: "error",
            message: json?.error ? `Erro no envio ${i + 1}: ${String(json.error)}` : `Falha ao enviar imagem ${i + 1}.`,
          });
          return;
        }
      }

      setStatus({
        kind: "success",
        message: `${files.length} imagem(ns) enviada(s) com sucesso para ${normalizedWbs}`,
      });
      setFiles([]);
      setDescription("");
    } catch (error) {
      setStatus({ kind: "error", message: String(error) });
    }
  }, [
    compressInBrowser,
    description,
    files,
    normalizedWbs,
    wbs,
    cc,
    os,
    date,
  ]);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="Estaleiro Mauá"
                className="h-15 w-35 rounded-xl border border-white/10 object-cover shadow-lg shadow-black/30"
              />
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white">
                  Fotos • WBS Upload
                </h1>
                <p className="text-sm text-zinc-400">
                  Supabase Storage
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
{/*             <div className="rounded-xl border border-[#2868A0] px-4 py-2 text-sm font-semibold text-zinc-100">
              Upload aberto para qualquer usuário
            </div> */}
          </div>
        </header>

{/*         <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-zinc-200">Sessão</p>
            {!isAuthed ? (
              <p className="text-sm text-zinc-400">Não autenticado.</p>
            ) : (
              <div className="text-sm text-zinc-300">
                <div className="font-medium text-zinc-100">
                  {userName ?? "Usuário"}
                </div>
                <div className="text-zinc-400">{userEmail}</div>
              </div>
            )}
          </div>
        </section> */}

        
        <section className="grid grid-cols-2 gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-200">CC (Centro de Custo)</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Ex: 1234"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#2868A0]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-200">DATA</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#2868A0]"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <label className="text-sm font-medium text-zinc-200">OS (Ordem de Serviço)</label>
          <input
            type="text"
            value={os}
            onChange={(e) => setOs(e.target.value)}
            placeholder="Ex: OS-999"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#2868A0]"
          />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <label className="text-sm font-medium text-zinc-200">TAREFA</label>
          <select
            value={wbs}
            onChange={(e) => setWbs(e.target.value)}
            disabled={wbsLoading || wbsList.length === 0}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#2868A0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {wbsLoading ? (
              <option>Carregando WBS...</option>
            ) : wbsList.length > 0 ? (
              wbsList.map((entry) => (
                <option key={entry.wbs} value={entry.wbs}>
                  {entry.wbs}
                  {entry.parent_task_path ? ` - ${entry.parent_task_path}` : ""}
                </option>
              ))
            ) : (
              <option>Nenhuma WBS disponível</option>
            )}
          </select>
          {wbsError ? (
            <p className="mt-2 text-xs text-rose-300">{wbsError}</p>
          ) : (
            <p className="mt-2 text-xs text-zinc-400">
              Será salvo como: <span className="text-zinc-200">{normalizedWbs}</span>
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <label className="text-sm font-medium text-zinc-200">DESCRIÇÃO</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional: Descreva o que está na foto..."
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#2868A0]"
          />
        </section>
<section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-200">IMAGEM</p>
            <button
              type="button"
              onClick={open}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900"
            >
              Selecionar arquivo
            </button>
          </div>

          <div
            {...getRootProps()}
            className={[
              "mt-3 rounded-2xl border border-dashed p-4 transition",
              isDragActive ? "border-[#2868A0] bg-[#2868A0]/10" : "border-zinc-700",
            ].join(" ")}
          >
            <input
              {...getInputProps({
                capture: "environment",
              })}
            />

            <div className="flex flex-col gap-3">
              <div className="text-sm text-zinc-300">
                <span className="font-semibold text-zinc-100">
                  Arraste e solte
                </span>{" "}
                ou use o botão acima (no celular abre a câmera).
              </div>

              {previewUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="aspect-square w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-600"
                      >
                        <span className="text-xs font-bold">X</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-zinc-900/40 px-4 py-10 text-center text-sm text-zinc-400">
                  Nenhuma imagem selecionada
                </div>
              )}
            </div>
          </div>
          {files.length > 0 && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              {files.length} de 4 imagens selecionadas
            </p>
          )}
        </section>
        <section className="flex flex-col gap-3">
          <button
            onClick={submit}
            disabled={status.kind === "loading"}
            className="rounded-2xl bg-[#2868A0] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f5f8c] disabled:opacity-60"
          >
            {status.kind === "loading" ? status.message : "Enviar imagem"}
          </button>

          {status.kind !== "idle" && status.kind !== "loading" ? (
            <div
              className={[
                "rounded-xl border px-4 py-3 text-sm",
                status.kind === "success"
                  ? "border-[#2868A0]/60 bg-[#2868A0]/10 text-white"
                  : "border-[#F08838]/60 bg-[#F08838]/10 text-[#F08838]",
              ].join(" ")}
            >
              {status.message}
            </div>
          ) : null}
        </section>

        <footer className="pt-2 text-center text-xs text-zinc-500">
          Dica: mantenha a imagem abaixo de 10MB (compressão automática).
        </footer>
      </div>
    </div>
  );
}

