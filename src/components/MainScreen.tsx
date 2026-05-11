"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { MAX_IMAGE_BYTES, normalizeWbs } from "@/lib/upload/validation";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

interface HistoryItem {
  id: string;
  data: string;
  cc: string;
  os: string;
  rdo_atividades: { wbs: string; descricao: string }[];
  rdo_imagens: { count: number }[];
}

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);

const GalleryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);

export function MainScreen() {
  const [wbs, setWbs] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [cc, setCc] = useState<string>("");
  const [ccOptions, setCcOptions] = useState<{ cc: string, descriçãocc: string }[]>([]);
  const [os, setOs] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [wbsList, setWbsList] = useState<{ wbs: string, subtask?: string, os?: string }[]>([]);
  const [wbsLoading, setWbsLoading] = useState(false);
  const [wbsError, setWbsError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);


  // Load History
  const fetchHistory = useCallback(async (page: number = 1) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/history?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.page || 1);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load initial options (CC and all Tasks) and History
  useEffect(() => {
    async function init() {
      try {
        setOptionsLoading(true);
        // Load CCs
        const optRes = await fetch("/api/options");
        if (optRes.ok) {
          const data = await optRes.json();
          setCcOptions(data.ccs || []);
          if (data.ccs?.length > 0) setCc(data.ccs[0].cc);
        }

        // Load all Tasks
        setWbsLoading(true);
        const taskRes = await fetch("/api/options/tasks");
        if (taskRes.ok) {
          const tasks = await taskRes.json();
          const formattedTasks = tasks.map((t: { WBS: string, Subtask: string, OS: string }) => ({
            wbs: t.WBS,
            subtask: t.Subtask,
            os: t.OS
          }));
          setWbsList(formattedTasks);
          if (formattedTasks.length > 0) {
            setWbs(formattedTasks[0].wbs);
            setOs(formattedTasks[0].os || "");
          }
        }

        // Fetch History
        fetchHistory();
      } catch (error) {
        console.error("Error initializing options:", error);
      } finally {
        setOptionsLoading(false);
        setWbsLoading(false);
      }
    }
    init();
  }, [fetchHistory]);


  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const next = [...prev, ...accepted].slice(0, 4);
      return next;
    });
  }, []);

  const handleManualSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onDrop(Array.from(e.target.files));
    }
    // Clear input so same file can be selected again
    e.target.value = "";
  }, [onDrop]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
      fetchHistory(1);
    } catch (error) {
      setStatus({ kind: "error", message: String(error) });
    }
  }, [
    compressInBrowser,
    description,
    files,
    fetchHistory,
    normalizedWbs,
    wbs,
    cc,
    os,
    date,
  ]);

  return (
    <div className={`min-h-dvh transition-colors duration-300 ${isDarkMode ? "bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-900"}`}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="Estaleiro Mauá"
                className={`h-20 w-auto rounded-xl border object-contain shadow-lg ${
                  isDarkMode ? "border-white/10 shadow-black/30" : "border-zinc-200 shadow-zinc-200/50"
                }`}
              />
              <div>
                <h1 className={`text-4xl font-black tracking-tighter transition-colors ${
                  isDarkMode ? "text-white" : "text-zinc-900"
                }`}>
                  RDO
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                isDarkMode 
                ? "bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800" 
                : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-100 shadow-sm"
              }`}
              title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
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


        <section className={`grid grid-cols-2 gap-4 rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex flex-col gap-2">
            <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>CC (Centro de Custo)</label>
            <select
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#2868A0] transition-colors ${
                isDarkMode 
                ? "border-zinc-700 bg-zinc-950 text-zinc-100" 
                : "border-zinc-200 bg-zinc-50 text-zinc-900"
              }`}
            >
              {optionsLoading ? (
                <option>Carregando...</option>
              ) : (
                ccOptions.map((item) => (
                  <option key={item.cc} value={item.cc}>
                    {item.cc} - {item.descriçãocc}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>DATA</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#2868A0] transition-colors ${
                isDarkMode 
                ? "border-zinc-700 bg-zinc-950 text-zinc-100" 
                : "border-zinc-200 bg-zinc-50 text-zinc-900"
              }`}
            />
          </div>
        </section>

        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>OS (Ordem de Serviço)</label>
          <input
            type="text"
            value={os}
            disabled
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none cursor-not-allowed transition-colors ${
              isDarkMode 
              ? "border-zinc-700 bg-zinc-900/50 text-zinc-400" 
              : "border-zinc-200 bg-zinc-100 text-zinc-500"
            }`}
          />
          <p className="mt-1 text-[10px] text-zinc-500 uppercase tracking-tight">
            Vinculado automaticamente à tarefa
          </p>
        </section>

        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>TAREFA</label>
          <select
            value={wbs}
            onChange={(e) => {
              const selectedWbs = e.target.value;
              setWbs(selectedWbs);
              const found = wbsList.find(t => t.wbs === selectedWbs);
              if (found) setOs(found.os || "");
            }}
            disabled={wbsLoading || wbsList.length === 0}
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#2868A0] disabled:cursor-not-allowed disabled:opacity-60 transition-colors ${
              isDarkMode 
              ? "border-zinc-700 bg-zinc-950 text-zinc-100" 
              : "border-zinc-200 bg-zinc-50 text-zinc-900"
            }`}
          >
            {wbsLoading ? (
              <option>Carregando tarefas...</option>
            ) : wbsList.length > 0 ? (
              wbsList.map((entry) => (
                <option key={entry.wbs} value={entry.wbs}>
                  {entry.wbs} - {entry.subtask || "Sem descrição"}
                </option>
              ))
            ) : (
              <option>Nenhuma tarefa encontrada para esta OS</option>
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

        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>DESCRIÇÃO</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional: Descreva o que está na foto..."
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#2868A0] transition-colors ${
              isDarkMode 
              ? "border-zinc-700 bg-zinc-950 text-zinc-100" 
              : "border-zinc-200 bg-zinc-50 text-zinc-900"
            }`}
          />
        </section>
        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex flex-col gap-4 mb-4">
            <p className={`text-sm font-medium uppercase tracking-wider ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>Imagens</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className={`flex items-center justify-center gap-3 rounded-xl border py-4 text-lg font-bold transition active:scale-95 ${
                  isDarkMode 
                  ? "bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800" 
                  : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                <CameraIcon /> Câmera
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className={`flex items-center justify-center gap-3 rounded-xl border py-4 text-lg font-bold transition active:scale-95 ${
                  isDarkMode 
                  ? "bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800" 
                  : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                <GalleryIcon /> Galeria
              </button>
            </div>
          </div>

          {/* Hidden Inputs */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={cameraInputRef}
            onChange={handleManualSelect}
          />
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            ref={galleryInputRef}
            onChange={handleManualSelect}
          />

          <div
            {...getRootProps()}
            className={`rounded-2xl border border-dashed p-6 transition-all duration-300 ${
              isDragActive 
              ? "border-[#2868A0] bg-[#2868A0]/10 scale-[1.02]" 
              : isDarkMode ? "border-zinc-800 bg-zinc-900/20" : "border-zinc-200 bg-zinc-50"
            }`}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-sm text-center">
                {isDragActive && (
                  <span className="text-[#2868A0] font-bold text-lg">Solte as imagens aqui</span>
                )}
              </div>

              {previewUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 w-full">
                  {previewUrls.map((url, index) => (
                    <div key={url} className={`group relative overflow-hidden rounded-xl border bg-black ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
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
                <div className={`rounded-xl px-4 py-10 text-center text-sm transition-colors ${isDarkMode ? "bg-zinc-900/40 text-zinc-400" : "bg-zinc-200/50 text-zinc-500"}`}>
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
            {status.kind === "loading" ? status.message : "Enviar RDO"}
          </button>

          {status.kind !== "idle" && status.kind !== "loading" && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm transition-all ${
                status.kind === "success"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                  : "border-rose-500/50 bg-rose-500/10 text-rose-500"
              }`}
            >
              {status.message}
            </div>
          )}
        </section>

        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-sm font-medium uppercase tracking-wider ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>
              Lançamentos Recentes
            </h2>
            <button 
              onClick={fetchHistory}
              disabled={historyLoading}
              className={`text-[10px] uppercase font-bold tracking-widest hover:underline disabled:opacity-50 ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}
            >
              {historyLoading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {history.length === 0 && !historyLoading ? (
              <p className={`text-xs text-center py-4 ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                Nenhum lançamento encontrado
              </p>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex flex-col gap-2 rounded-xl border p-3 transition-all ${
                    isDarkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50 border-zinc-100 shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-xs font-bold ${isDarkMode ? "text-zinc-300" : "text-zinc-800"}`}>
                        OS {item.os}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(item.data).toLocaleDateString('pt-BR')} • CC {item.cc}
                      </p>
                    </div>
                    <div className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isDarkMode ? "bg-zinc-800 text-zinc-400" : "bg-white text-zinc-500 border border-zinc-100"}`}>
                      {item.rdo_imagens?.[0]?.count || 0} FOTOS
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    {item.rdo_atividades?.map((atv, idx) => (
                      <div key={idx} className="flex gap-2 items-baseline">
                        <span className="text-[10px] font-mono text-[#2868A0] font-bold">{atv.wbs}</span>
                        <span className={`text-[11px] truncate ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>{atv.descricao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4 px-1">
              <button
                onClick={() => fetchHistory(currentPage - 1)}
                disabled={currentPage === 1 || historyLoading}
                className={`text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg border transition-all disabled:opacity-30 ${
                  isDarkMode 
                  ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Anterior
              </button>
              
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => fetchHistory(currentPage + 1)}
                disabled={currentPage === totalPages || historyLoading}
                className={`text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg border transition-all disabled:opacity-30 ${
                  isDarkMode 
                  ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Próxima
              </button>
            </div>
          )}
        </section>

        <footer className="pt-2 text-center text-xs text-zinc-500">
          Dica: mantenha a imagem abaixo de 10MB (compressão automática).
        </footer>
      </div>
    </div>
  );
}

