"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { normalizeWbs } from "@/lib/upload/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CCItem } from "@/lib/external-api";

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
  rdo_atividades: { wbs: string; descricao: string; fotos: number; urls?: string[]; editado?: boolean }[];
  totalFotos: number;
}

interface FileWithType {
  file: File;
  uploadType: "camera" | "gallery";
}

interface MauaTask {
  id_eap: string | number;
  wbs: string;
  subtask?: string;
  os?: string;
  item?: string;
  codAtiv?: string;
  cod_os?: string;
  descr_os?: string;
  cod_atividade?: string;
  descr_atividade?: string;
  descricao?: string;
}

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
);

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
);

const GalleryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
);

export function MainScreen() {
  const [wbs, setWbs] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [cc, setCc] = useState<string>("");
  const [ccOptions, setCcOptions] = useState<CCItem[]>([]);
  const [os, setOs] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dateFilterType, setDateFilterType] = useState<'active' | 'start' | 'end'>('active');
  const [selectedTaskId, setSelectedTaskId] = useState<string | number>("");
  const [wbsList, setWbsList] = useState<MauaTask[]>([]);
  const [wbsLoading, setWbsLoading] = useState(false);
  const [files, setFiles] = useState<FileWithType[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);
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
    const urls = files.map((f) => URL.createObjectURL(f.file));
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
        // Load CCs with date filter and type
        const optRes = await fetch(`/api/options?date=${date}&type=${dateFilterType}`);
        if (optRes.ok) {
          const data = await optRes.json();
          setCcOptions(data.ccs || []);

          // Se o CC atual não estiver na nova lista, seleciona o primeiro disponível
          const currentCcStillExists = data.ccs?.some((item: CCItem) => String(item.cod_ccusto) === cc);
          if (!currentCcStillExists && data.ccs?.length > 0) {
            setCc(String(data.ccs[0].cod_ccusto));
          } else if (data.ccs?.length === 0) {
            setCc("");
          }
        }

        // Fetch History
        fetchHistory();
      } catch (error) {
        console.error("Error initializing options:", error);
      } finally {
        setOptionsLoading(false);
      }
    }
    init();
  }, [fetchHistory, date, dateFilterType, cc]);

  // Load Tasks when CC changes
  useEffect(() => {
    async function loadTasks() {
      if (!cc) return;
      try {
        setWbsLoading(true);
        const taskRes = await fetch(`/api/options/tasks?cc=${cc}`);
        if (taskRes.ok) {
          const tasks = await taskRes.json();
          const formattedTasks = tasks.map((t: { id_eap: string | number, wbs: string, subtask?: string, os?: string, item?: string, codAtiv?: string, cod_os?: string, descr_os?: string, cod_atividade?: string, descr_atividade?: string, descricao?: string }) => ({
            id_eap: t.id_eap,
            wbs: t.wbs,
            subtask: t.subtask,
            os: t.os,
            item: t.item,
            codAtiv: t.codAtiv,
            cod_os: t.cod_os,
            descr_os: t.descr_os,
            cod_atividade: t.cod_atividade,
            descr_atividade: t.descr_atividade,
            descricao: t.descricao
          }));
          setWbsList(formattedTasks);
          if (formattedTasks.length > 0) {
            setSelectedTaskId(formattedTasks[0].id_eap);
            setWbs(formattedTasks[0].wbs);
            setOs(formattedTasks[0].os || formattedTasks[0].cod_os || "");
          }
        }
      } catch (error) {
        console.error("Error loading tasks:", error);
      } finally {
        setWbsLoading(false);
      }
    }
    loadTasks();
  }, [cc]);


  const onDrop = useCallback((accepted: File[], type: "camera" | "gallery") => {
    const alreadyUploaded = history.find(h => h.cc === cc && h.data === date)?.rdo_atividades.find(a => normalizeWbs(a.wbs) === normalizeWbs(wbs))?.fotos || 0;
    const remaining = 4 - alreadyUploaded;

    setFiles((prev) => {
      const newFiles = accepted.map(f => ({ file: f, uploadType: type }));
      const next = [...prev, ...newFiles].slice(0, remaining);
      return next;
    });
  }, [history, cc, date, wbs]);

  const handleManualSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: "camera" | "gallery") => {
    if (e.target.files) {
      onDrop(Array.from(e.target.files), type);
    }
    // Clear input so same file can be selected again
    e.target.value = "";
  }, [onDrop]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDropzoneDrop = useCallback((acceptedFiles: File[]) => {
    onDrop(acceptedFiles, "gallery"); // Dropzone defaults to gallery
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDropzoneDrop,
    multiple: true,
    maxFiles: Math.max(0, 4 - (history.find(h => h.cc === cc && h.data === date)?.rdo_atividades.find(a => normalizeWbs(a.wbs) === normalizeWbs(wbs))?.fotos || 0)),
    noClick: true,
    accept: { "image/*": [] },
  });


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
    if (!wbs) {
      setStatus({ kind: "error", message: "Selecione uma Tarefa (WBS)." });
      return;
    }
    if (!os) {
      setStatus({ kind: "error", message: "A OS é obrigatória." });
      return;
    }
    if (!cc) {
      setStatus({ kind: "error", message: "O Centro de Custo (CC) é obrigatório." });
      return;
    }

    try {
      const compressedFiles: Blob[] = [];
      for (let i = 0; i < files.length; i++) {
        const progress = files.length > 1 ? ` (${i + 1}/${files.length})` : "";
        setStatus({ kind: "loading", message: `Comprimindo imagem${progress}...` });
        const compressed = await compressInBrowser(files[i].file);
        compressedFiles.push(compressed);
      }

      setStatus({ kind: "loading", message: `Enviando ${files.length} fotos...` });
      const form = new FormData();
      compressedFiles.forEach((blob, index) => {
        form.append("file", blob);
        form.append(`uploadType_${index}`, files[index].uploadType);
      });
      form.set("wbs", wbs);
      form.set("description", description);
      form.set("cc", cc);
      form.set("os", os);
      form.set("date", date);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as
        | null
        | { error?: string; details?: { fieldErrors?: Record<string, string[]> }; success?: boolean };

      if (!res.ok) {
        let errorMsg = "Falha ao enviar.";
        if (json?.error === "invalid_input" && json.details?.fieldErrors) {
          const firstError = Object.values(json.details.fieldErrors)[0]?.[0];
          errorMsg = firstError || "Erro de validação nos campos.";
        } else if (json?.error) {
          errorMsg = String(json.error);
        }

        setStatus({
          kind: "error",
          message: `Erro no envio: ${errorMsg}`,
        });
        return;
      }

      setStatus({ kind: "success", message: "RDO enviado com sucesso!" });
      setFiles([]);
      setDescription("");
      setCurrentPage(1);
      fetchHistory(1);
    } catch (error) {
      console.error("Upload error:", error);
      setStatus({ kind: "error", message: "Erro inesperado ao enviar." });
    }
  }, [
    compressInBrowser,
    description,
    files,
    fetchHistory,
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
                className={`h-15 w-auto rounded-xl border object-contain shadow-lg ${isDarkMode ? "border-white/10 shadow-black/30" : "border-zinc-200 shadow-zinc-200/50"
                  }`}
              />
              <div>
                <h1 className={`text-4xl font-black tracking-tighter transition-colors ${isDarkMode ? "text-white" : "text-zinc-900"
                  }`}>
                  Mauá RDO
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const supabase = createSupabaseBrowserClient();
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                className={`p-2.5 rounded-xl border transition-all active:scale-95 ${isDarkMode
                  ? "bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                  : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-100 shadow-sm"
                  }`}
                title="Sair do sistema"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl border transition-all active:scale-95 ${isDarkMode
                  ? "bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                  : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-100 shadow-sm"
                  }`}
                title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
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
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#2868A0] transition-colors ${isDarkMode
                ? "border-zinc-700 bg-zinc-950 text-zinc-100"
                : "border-zinc-200 bg-zinc-50 text-zinc-900"
                }`}
            >
              {optionsLoading ? (
                <option>Carregando...</option>
              ) : (
                ccOptions.map((item) => (
                  <option key={item.cod_ccusto} value={item.cod_ccusto}>
                    {item.descr_ccusto} - {item.cod_ccusto}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>DATA</label>
              <div className="flex gap-1">
                {[
                  { id: 'active', label: 'Vigentes' },
                  { id: 'start', label: 'Início' },
                  { id: 'end', label: 'Fim' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setDateFilterType(type.id as 'active' | 'start' | 'end')}
                    className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter rounded-md border transition-all ${dateFilterType === type.id
                      ? "bg-[#2868A0] border-[#2868A0] text-white"
                      : isDarkMode ? "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800" : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200"
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#2868A0] transition-colors ${isDarkMode
                ? "border-zinc-700 bg-zinc-950 text-zinc-100"
                : "border-zinc-200 bg-zinc-50 text-zinc-900"
                }`}
            />
          </div>
        </section>

        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>ATIVIDADE</label>
          <select
            value={selectedTaskId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedTaskId(id);
              const found = wbsList.find(t => String(t.id_eap) === String(id));
              if (found) {
                setWbs(found.wbs);
                setOs(found.os || found.cod_os || "");
              }
            }}
            disabled={wbsLoading || wbsList.length === 0}
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#2868A0] disabled:cursor-not-allowed disabled:opacity-60 transition-colors ${isDarkMode
              ? "border-zinc-700 bg-zinc-950 text-zinc-100"
              : "border-zinc-200 bg-zinc-50 text-zinc-900"
              }`}
          >
            {wbsLoading ? (
              <option>Carregando tarefas...</option>
            ) : wbsList.length > 0 ? (
              wbsList.map((entry) => {
                const isLaunched = history.find(h => h.cc === cc && h.data === date)?.rdo_atividades.some(a => normalizeWbs(a.wbs) === normalizeWbs(entry.wbs));
                return (
                  <option key={entry.id_eap} value={entry.id_eap}>
                    {isLaunched ? "📝 " : ""}{entry.wbs} - {entry.cod_atividade || "-"} - {entry.descr_atividade || entry.subtask || "-"}
                  </option>
                );
              })
            ) : (
              <option key="no-tasks">Nenhuma tarefa encontrada para esta OS</option>
            )}
          </select>
          <p className="mt-2 text-xs text-zinc-400">
            Será salvo como: <span className="text-zinc-200">{wbs ? normalizeWbs(wbs) : "-"}</span>
          </p>
        </section>

        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>OS (Ordem de Serviço)</label>
          <input
            type="text"
            value={wbsList.find(t => t.wbs === wbs)?.cod_os ? `${wbsList.find(t => t.wbs === wbs)?.cod_os} - ${wbsList.find(t => t.wbs === wbs)?.descr_os || os}` : os}
            disabled
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none cursor-not-allowed transition-colors ${isDarkMode
              ? "border-zinc-700 bg-zinc-900/50 text-zinc-400"
              : "border-zinc-200 bg-zinc-100 text-zinc-500"
              }`}
          />
          <p className="mt-1 text-[10px] text-zinc-500 uppercase tracking-tight">
            Vinculado automaticamente à tarefa
          </p>
        </section>



        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>DESCRIÇÃO</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional: Descreva o que está na foto..."
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#2868A0] transition-colors ${isDarkMode
              ? "border-zinc-700 bg-zinc-950 text-zinc-100"
              : "border-zinc-200 bg-zinc-50 text-zinc-900"
              }`}
          />
          {/* Aviso de Atividade já lançada */}
          {history.find(h => h.cc === cc && h.data === date)?.rdo_atividades.some(a => normalizeWbs(a.wbs) === normalizeWbs(wbs)) && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 animate-in fade-in slide-in-from-top-1 ${isDarkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-amber-50 border-amber-200 text-amber-600"
              }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span className="text-[10px] font-bold uppercase tracking-tight">Esta atividade já possui registros para hoje. Novas fotos serão adicionadas.</span>
            </div>
          )}
        </section>
        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <p className={`text-base font-black uppercase tracking-tight ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Imagens</p>
              {(() => {
                const alreadyUploaded = history.find(h => h.cc === cc && h.data === date)?.rdo_atividades.find(a => normalizeWbs(a.wbs) === normalizeWbs(wbs))?.fotos || 0;
                return (
                  <span className={`text-sm font-black px-4 py-1.5 rounded-xl border ${
                    isDarkMode ? "bg-[#2868A0]/10 border-[#2868A0]/30 text-[#2868A0]" : "bg-[#2868A0]/5 border-[#2868A0]/20 text-[#2868A0]"
                  }`}>
                    {alreadyUploaded}/4 ENVIADAS
                  </span>
                );
              })()}
            </div>

            {(() => {
              const alreadyUploaded = history.find(h => h.cc === cc && h.data === date)?.rdo_atividades.find(a => normalizeWbs(a.wbs) === normalizeWbs(wbs))?.fotos || 0;
              const remaining = 4 - alreadyUploaded;

              if (remaining <= 0) {
                return (
                  <div className={`flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed ${isDarkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-rose-50 border-rose-200 text-rose-600"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    <span className="text-xs font-bold uppercase">Limite de 4 fotos atingido para esta atividade</span>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={files.length >= remaining}
                    className={`flex items-center justify-center gap-3 rounded-xl border py-4 text-lg font-bold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
                      ? "bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                      : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"
                      }`}
                  >
                    <CameraIcon /> Câmera
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={files.length >= remaining}
                    className={`flex items-center justify-center gap-3 rounded-xl border py-4 text-lg font-bold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode
                      ? "bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                      : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"
                      }`}
                  >
                    <GalleryIcon /> Galeria
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Hidden Inputs com limite dinâmico */}
          {(() => {
            const alreadyUploaded = history.find(h => h.cc === cc && h.data === date)?.rdo_atividades.find(a => normalizeWbs(a.wbs) === normalizeWbs(wbs))?.fotos || 0;
            const remaining = 4 - alreadyUploaded;
            return (
              <>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={cameraInputRef}
                  onChange={(e) => handleManualSelect(e, "camera")}
                />
                <input
                  type="file"
                  accept="image/*"
                  multiple={remaining > 1}
                  className="hidden"
                  ref={galleryInputRef}
                  onChange={(e) => handleManualSelect(e, "gallery")}
                />
              </>
            );
          })()}

          <div
            {...getRootProps()}
            className={`rounded-2xl border border-dashed p-6 transition-all duration-300 ${isDragActive
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
          {(() => {
            const alreadyUploaded = history.find(h => h.cc === cc && h.data === date)?.rdo_atividades.find(a => normalizeWbs(a.wbs) === normalizeWbs(wbs))?.fotos || 0;
            const remaining = 4 - alreadyUploaded;
            if (remaining > 0 && files.length > 0) {
              return (
                <p className="mt-2 text-center text-xs text-zinc-500">
                  {files.length} de {remaining} {remaining === 1 ? "vaga disponível" : "vagas disponíveis"} selecionada(s)
                </p>
              );
            }
            return null;
          })()}
        </section>
        <section className="flex flex-col gap-3">
          <button
            onClick={submit}
            disabled={status.kind === "loading"}
            className="rounded-2xl bg-[#2868A0] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f5f8c] disabled:opacity-60"
          >
            {status.kind === "loading"
              ? status.message
              : history.find(h => h.cc === cc && h.data === date)?.rdo_atividades.some(a => normalizeWbs(a.wbs) === normalizeWbs(wbs))
                ? "Atualizar RDO"
                : "Enviar RDO"
            }
          </button>

          {status.kind !== "idle" && status.kind !== "loading" && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm transition-all ${status.kind === "success"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                : "border-rose-500/50 bg-rose-500/10 text-rose-500"
                }`}
            >
              {status.message}
            </div>
          )}
        </section>

        <section className={`rounded-2xl border p-5 transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
              Lançamentos Recentes
            </h2>
            <button
              onClick={() => fetchHistory(1)}
              disabled={historyLoading}
              className={`text-xs uppercase font-black tracking-widest hover:underline disabled:opacity-50 px-4 py-2 rounded-xl border ${
                isDarkMode ? "text-zinc-400 border-zinc-800 bg-zinc-900" : "text-zinc-500 border-zinc-200 bg-zinc-50"
              }`}
            >
              {historyLoading ? "Atualizando..." : "Atualizar Lista"}
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
                  onClick={() => setSelectedHistoryItem(item)}
                  className={`flex flex-col gap-4 rounded-2xl border p-6 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 ${isDarkMode 
                    ? "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/60 hover:border-zinc-700" 
                    : "bg-zinc-50 border-zinc-100 shadow-sm hover:bg-white hover:border-zinc-200 hover:shadow-md"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? "text-[#2868A0]" : "text-[#2868A0]"}`}>
                          CC {item.cc}
                        </span>
                        <span className={`text-xs font-bold ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                          • {item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                        </span>
                      </div>
                      <h3 className={`text-lg font-black tracking-tight ${isDarkMode ? "text-zinc-100" : "text-zinc-900"}`}>
                        OS {item.os}
                      </h3>
                    </div>
                    <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border ${
                      isDarkMode ? "bg-zinc-950 border-zinc-800 text-[#2868A0]" : "bg-white border-zinc-100 text-[#2868A0]"
                    }`}>
                      <span className="text-sm font-black">{item.totalFotos}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.rdo_atividades?.map((atv, i) => (
                      <span key={i} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase tracking-tighter ${
                        isDarkMode ? "bg-zinc-800/50 border-zinc-700 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-500"
                      }`}>
                        {atv.wbs}
                        {atv.editado && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                      </span>
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
                className={`text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg border transition-all disabled:opacity-30 ${isDarkMode
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
                className={`text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg border transition-all disabled:opacity-30 ${isDarkMode
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

      {/* Modal de Detalhes do Histórico */}
      {selectedHistoryItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedHistoryItem(null)}
        >
          <div
            className={`relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] border shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] transition-all animate-in zoom-in-95 duration-300 ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className={`flex items-center justify-between border-b px-10 py-8 ${isDarkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
              <div>
                <h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Detalhes do RDO</h3>
                <p className="text-sm text-zinc-500 uppercase tracking-[0.2em] font-bold mt-1">Informações registradas</p>
              </div>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all hover:rotate-90 ${isDarkMode ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="max-h-[85vh] overflow-y-auto p-12">
              <div className="grid grid-cols-2 gap-10 mb-12">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#2868A0]">Ordem de Serviço</span>
                  <span className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>OS {selectedHistoryItem.os}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#2868A0]">Data do RDO</span>
                  <span className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {selectedHistoryItem.data ? new Date(selectedHistoryItem.data + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#2868A0]">Centro de Custo</span>
                  <span className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>CC {selectedHistoryItem.cc}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#2868A0]">Total de Fotos</span>
                  <span className={`inline-flex w-fit rounded-xl px-4 py-1.5 text-xs font-black ${isDarkMode ? "bg-[#2868A0]/20 text-[#2868A0] border border-[#2868A0]/30" : "bg-[#2868A0]/10 text-[#2868A0] border border-[#2868A0]/20"
                    }`}>
                    {selectedHistoryItem.totalFotos} FOTOS ENVIADAS
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <h4 className={`text-sm font-black uppercase tracking-[0.2em] ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Atividades Relacionadas</h4>
                <div className="flex flex-col gap-3">
                  {selectedHistoryItem.rdo_atividades?.map((atv, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col gap-4 rounded-3xl border p-8 transition-colors ${isDarkMode ? "bg-zinc-800/40 border-zinc-700" : "bg-zinc-50 border-zinc-100"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-2">
                          <span className={`text-xl font-black ${isDarkMode ? "text-[#2868A0]" : "text-[#2868A0]"}`}>{atv.wbs}</span>
                          {atv.editado && (
                            <span className="w-fit rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-amber-500 border border-amber-500/30">
                              Editado
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg ${isDarkMode ? "bg-zinc-900 text-zinc-500" : "bg-white text-zinc-400 border border-zinc-100"
                          }`}>
                          {atv.fotos} FOT.
                        </span>
                      </div>

                      <p className={`text-lg font-medium leading-relaxed ${isDarkMode ? "text-zinc-300" : "text-zinc-600"}`}>
                        {atv.descricao || "Sem comentário"}
                      </p>

                      {atv.urls && atv.urls.length > 0 && (
                        <button
                          onClick={() => setViewingPhotos(atv.urls)}
                          className="w-fit text-[11px] font-black uppercase tracking-widest text-[#2868A0] hover:underline flex items-center gap-2 mt-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                          Ver fotos desta atividade
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className={`border-t p-10 ${isDarkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="w-full rounded-[1.5rem] bg-[#2868A0] py-6 text-xl font-black text-white shadow-lg shadow-[#2868A0]/30 transition-all hover:bg-[#1f5f8c] active:scale-95"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Galeria de Fotos */}
      {viewingPhotos && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setViewingPhotos(null)}
        >
          <button
            onClick={() => setViewingPhotos(null)}
            className="absolute right-6 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>

          <div
            className="w-full max-w-4xl max-h-[85vh] overflow-y-auto px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {viewingPhotos.map((url, i) => (
                <div key={i} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-auto object-contain max-h-[60vh] transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-white text-xs font-bold uppercase tracking-widest">Foto {i + 1} de {viewingPhotos.length}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="absolute bottom-10 text-white/40 text-[10px] uppercase font-bold tracking-widest">
            Clique fora para fechar a galeria
          </p>
        </div>
      )}
    </div>
  );
}

