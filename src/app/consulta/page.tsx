"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CCItem } from "@/lib/external-api";
import Link from "next/link";

interface HistoryItem {
  id: string;
  data: string;
  cc: string;
  os: string;
  rdo_atividades: {
    id_atividade: string | number;
    wbs: string;
    descricao: string;
    fotos: number;
    urls?: string[];
    editado?: boolean;
  }[];
  totalFotos: number;
}

interface MauaTask {
  id_eap?: string | number;
  os?: string | number;
  OS?: string | number;
  cod_os?: string | number;
  descr_os?: string;
}

interface OsItem extends HistoryItem {
  hasLaunch: boolean;
  taskCount: number;
  descrOs?: string;
}

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
);

const FormIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);

export default function ConsultaPage() {
  const pageSize = 10;
  const [ccOptions, setCcOptions] = useState<CCItem[]>([]);
  const [cc, setCc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [osFilter, setOsFilter] = useState("");
  const [osItems, setOsItems] = useState<OsItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOsId, setExpandedOsId] = useState<string | null>(null);
  const [selectedRdo, setSelectedRdo] = useState<OsItem | null>(null);
  const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [osLoading, setOsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(osItems.length / pageSize));
  const paginatedOsItems = useMemo(
    () => osItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, osItems],
  );
  const isAdmin = userRole === "admin" || userRole === "owner";
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("rdo-theme");
    setIsDarkMode(savedTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("rdo-theme", next ? "dark" : "light");
    setIsMenuOpen(false);
  };

  useEffect(() => {
    async function getRole() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userEmail = (user.email || "").trim().toLowerCase();
      const { data: authUser } = await supabase
        .from("authorized_users")
        .select("role")
        .ilike("email", userEmail)
        .maybeSingle();

      if (authUser?.role) {
        setUserRole(authUser.role);
        return;
      }

      const owners = new Set([
        "wladmir.carmo@estaleiromaua.ind.br",
        "alexander.araujo@estaleiromaua.ind.br",
      ]);

      if (owners.has(userEmail)) {
        setUserRole("owner");
      }
    }

    getRole();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [cc, date, osFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    async function loadCcs() {
      setOptionsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/options?date=${date}&type=active`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Erro ao carregar CCs");
        }

        const ccs = data.ccs || [];
        setCcOptions(ccs);
        setCc((currentCc) => {
          const currentExists = ccs.some((item: CCItem) => String(item.cod_ccusto) === currentCc);
          return currentExists ? currentCc : ccs[0] ? String(ccs[0].cod_ccusto) : "";
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar CCs");
        setCcOptions([]);
        setCc("");
      } finally {
        setOptionsLoading(false);
      }
    }

    loadCcs();
  }, [date]);

  const fetchOsItems = useCallback(async () => {
    if (!cc) {
      setOsItems([]);
      return;
    }

    setOsLoading(true);
    setError(null);

    try {
      const taskParams = new URLSearchParams({ cc });
      const historyParams = new URLSearchParams({
        page: "1",
        limit: "100",
        cc,
        date,
      });

      const [tasksRes, historyRes] = await Promise.all([
        fetch(`/api/options/tasks?${taskParams.toString()}`),
        fetch(`/api/history?${historyParams.toString()}`),
      ]);
      const tasksData = await tasksRes.json();
      const historyData = await historyRes.json();

      if (!tasksRes.ok) {
        throw new Error(tasksData?.error || "Erro ao carregar OS do CC");
      }

      if (!historyRes.ok) {
        throw new Error(historyData?.error || "Erro ao carregar lancamentos");
      }

      const osMap = new Map<string, OsItem>();

      (Array.isArray(tasksData) ? tasksData : []).forEach((task: MauaTask) => {
        const osValue = task.os ?? task.OS ?? task.cod_os;
        if (!osValue) return;

        const os = String(osValue);
        const existing = osMap.get(os);

        if (existing) {
          existing.taskCount += 1;
          if (!existing.descrOs && task.descr_os) existing.descrOs = task.descr_os;
          return;
        }

        osMap.set(os, {
          id: `os-${os}`,
          data: date,
          cc,
          os,
          descrOs: task.descr_os,
          rdo_atividades: [],
          totalFotos: 0,
          hasLaunch: false,
          taskCount: 1,
        });
      });

      (historyData.history || []).forEach((item: HistoryItem) => {
        const existing = osMap.get(item.os);

        osMap.set(item.os, {
          ...item,
          id: existing?.id || item.id,
          descrOs: existing?.descrOs,
          taskCount: existing?.taskCount || 0,
          hasLaunch: true,
        });
      });

      const filter = osFilter.trim().toLowerCase();
      const merged = Array.from(osMap.values())
        .filter((item) => !filter || item.os.toLowerCase().includes(filter) || item.descrOs?.toLowerCase().includes(filter))
        .sort((a, b) => a.os.localeCompare(b.os, "pt-BR", { numeric: true }));

      setOsItems(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar OS");
      setOsItems([]);
    } finally {
      setOsLoading(false);
    }
  }, [cc, date, osFilter]);

  useEffect(() => {
    fetchOsItems();
  }, [fetchOsItems]);

  const logout = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      try {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          user_email: user.email,
          action_type: "LOGOUT",
          details: { method: "consulta_button" },
        });
      } catch (err) {
        console.error("Erro ao registrar log de logout:", err);
      }
    }

    await supabase.auth.signOut();
    window.location.reload();
  };

  const deleteActivity = async (activityId: string | number) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade e todas as fotos vinculadas?")) {
      return;
    }

    setDeletingActivityId(activityId);
    setError(null);

    try {
      const res = await fetch(`/api/rdo/activity/${activityId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao excluir atividade");
      }

      setSelectedRdo(null);
      await fetchOsItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir atividade");
    } finally {
      setDeletingActivityId(null);
    }
  };

  return (
    <div className={`min-h-dvh transition-colors duration-300 ${isDarkMode ? "bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-900"}`}>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4">
        <header className="flex items-start justify-between gap-4 rounded-3xl bg-[#364B59] px-4 py-3 shadow-lg shadow-[#364B59]/20">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="Estaleiro Maua"
              className="h-15 w-auto rounded-xl border border-white/40 bg-white object-contain shadow-lg shadow-black/20"
            />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">Consulta</p>
              <h1 className="text-4xl font-black tracking-tighter text-white">Maua RDO</h1>
            </div>
          </div>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white text-zinc-900 shadow-sm transition-all hover:bg-zinc-100 active:scale-95"
            >
              {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            {isMenuOpen && (
              <div className={`absolute right-0 top-14 z-40 w-56 overflow-hidden rounded-3xl border p-2 shadow-2xl ${isDarkMode ? "border-zinc-800 bg-zinc-950 text-zinc-100 shadow-black/40" : "border-zinc-200 bg-white text-zinc-900 shadow-zinc-300/60"}`}>
                <div className={`px-4 pb-2 pt-3 text-[10px] font-black uppercase tracking-[0.24em] ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                  Menu
                </div>
                {userRole !== "consulta" && (
                  <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] ${isDarkMode ? "text-zinc-100 hover:bg-zinc-900" : "text-zinc-900 hover:bg-zinc-50"}`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#364B59]/10 text-[#364B59]">
                      <FormIcon />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-black">RDO</span>
                      <span className="text-[11px] font-bold text-zinc-400">Lançamento de fotos</span>
                    </span>
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] ${isDarkMode ? "text-zinc-100 hover:bg-zinc-900" : "text-zinc-900 hover:bg-zinc-50"}`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#364B59]/10 text-[#364B59]">
                      <ShieldIcon />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-black">Dashboard</span>
                      <span className="text-[11px] font-bold text-zinc-400">Painel administrativo</span>
                    </span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] ${isDarkMode ? "text-zinc-100 hover:bg-zinc-900" : "text-zinc-900 hover:bg-zinc-50"}`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDarkMode ? "bg-[#F18213]/15 text-[#F18213]" : "bg-zinc-100 text-zinc-700"}`}>
                    {isDarkMode ? <SunIcon /> : <MoonIcon />}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-black">{isDarkMode ? "Tema claro" : "Tema escuro"}</span>
                    <span className="text-[11px] font-bold text-zinc-400">Alternar aparência</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] ${isDarkMode ? "text-rose-400 hover:bg-rose-500/10" : "text-rose-600 hover:bg-rose-50"}`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDarkMode ? "bg-rose-500/15" : "bg-rose-50"}`}>
                    <LogoutIcon />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-black">Logout</span>
                    <span className="text-[11px] font-bold text-rose-400">Sair do sistema</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </header>

        <section className={`rounded-3xl border p-4 shadow-lg transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60 shadow-black/20" : "border-zinc-200 bg-white shadow-zinc-200/20"}`}>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase tracking-widest text-[#364B59]">CC (Centro de Custo)</label>
              <select
                value={cc}
                onChange={(event) => setCc(event.target.value)}
                disabled={optionsLoading || ccOptions.length === 0}
                className={`w-full rounded-2xl border px-5 py-4 text-lg font-bold outline-none transition-all focus:border-[#364B59] focus:ring-4 focus:ring-[#364B59]/10 disabled:cursor-not-allowed disabled:opacity-60 ${isDarkMode ? "border-zinc-700 bg-zinc-950 text-zinc-100" : "border-zinc-200 bg-zinc-50 text-zinc-900"}`}
              >
                {optionsLoading ? (
                  <option>Carregando...</option>
                ) : ccOptions.length === 0 ? (
                  <option>Nenhum CC encontrado</option>
                ) : (
                  ccOptions.map((item) => (
                    <option key={item.cod_ccusto} value={item.cod_ccusto}>
                      {item.descr_ccusto} - {item.cod_ccusto}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase tracking-widest text-[#364B59]">Buscar CC por data</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={`w-full rounded-2xl border px-5 py-4 text-lg font-bold outline-none transition-all focus:border-[#364B59] focus:ring-4 focus:ring-[#364B59]/10 ${isDarkMode ? "border-zinc-700 bg-zinc-950 text-zinc-100" : "border-zinc-200 bg-zinc-50 text-zinc-900"}`}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase tracking-widest text-[#364B59]">Buscar OS</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  value={osFilter}
                  onChange={(event) => setOsFilter(event.target.value)}
                  placeholder="Digite a OS"
                  className={`w-full rounded-2xl border py-4 pl-12 pr-5 text-lg font-bold outline-none transition-all placeholder:text-zinc-400 focus:border-[#364B59] focus:ring-4 focus:ring-[#364B59]/10 ${isDarkMode ? "border-zinc-700 bg-zinc-950 text-zinc-100" : "border-zinc-200 bg-zinc-50 text-zinc-900"}`}
                />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-600">
            {error}
          </div>
        )}

        <section className={`rounded-3xl border p-4 shadow-sm transition-colors ${isDarkMode ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white"}`}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? "text-zinc-100" : "text-zinc-900"}`}>OS Encontradas</h2>
            <div className="flex items-center gap-2">
              <span className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "border-zinc-800 bg-zinc-900 text-zinc-500" : "border-zinc-100 bg-zinc-50 text-zinc-400"}`}>
                {osItems.length} OS
              </span>
              <button
                type="button"
                onClick={fetchOsItems}
                disabled={osLoading}
                className={`rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${isDarkMode ? "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800" : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100"}`}
              >
                {osLoading ? "Atualizando..." : "Atualizar Lista"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {osItems.length === 0 && !osLoading ? (
              <p className="py-4 text-center text-xs text-zinc-400">Nenhuma OS encontrada</p>
            ) : (
              paginatedOsItems.map((item) => (
                <article
                  key={item.id}
                  onClick={() => setExpandedOsId((current) => current === item.id ? null : item.id)}
                  className={`flex cursor-pointer flex-col gap-3 rounded-3xl border p-4 shadow-sm transition-all ${isDarkMode ? "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900" : "border-zinc-100 bg-zinc-50 hover:border-zinc-200 hover:bg-white hover:shadow-md"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-[#364B59]">CC {item.cc}</span>
                        <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest ${item.hasLaunch ? (isDarkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600") : (isDarkMode ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-400")}`}>
                          {item.hasLaunch ? "Com lançamento" : "Sem lançamento"}
                        </span>
                      </div>
                      <h3 className={`text-lg font-black tracking-tight ${isDarkMode ? "text-zinc-100" : "text-zinc-900"}`}>OS {item.os}</h3>
                      {item.descrOs && (
                        <p className={`text-xs font-bold ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>{item.descrOs}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 ${isDarkMode ? "border-zinc-800 bg-zinc-950 text-zinc-300" : "border-zinc-100 bg-white text-[#364B59]"}`}>
                      <span className="text-sm font-black">{item.hasLaunch ? 1 : 0}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">RDOs</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.rdo_atividades?.length > 0 ? (
                      item.rdo_atividades.map((atv) => (
                        <span
                          key={atv.id_atividade}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase tracking-tighter ${isDarkMode ? "border-zinc-700 bg-zinc-800 text-zinc-400" : "border-zinc-200 bg-zinc-100 text-zinc-500"}`}
                        >
                          {atv.wbs}
                          {atv.editado && <span className="h-1.5 w-1.5 rounded-full bg-[#F18213] shadow-[0_0_8px_rgba(241,130,19,0.5)]" />}
                        </span>
                      ))
                    ) : (
                      <span className={`inline-flex items-center rounded-lg border border-dashed px-3 py-1.5 text-[11px] font-black uppercase tracking-widest ${isDarkMode ? "border-zinc-700 bg-zinc-950 text-zinc-500" : "border-zinc-200 bg-white text-zinc-400"}`}>
                        {item.taskCount} atividades disponiveis
                      </span>
                    )}
                  </div>

                  {expandedOsId === item.id && (
                    <div className={`mt-2 rounded-2xl border p-4 ${isDarkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-100 bg-white"}`} onClick={(event) => event.stopPropagation()}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#364B59]">RDOs vinculados</h4>
                        <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-400"}`}>
                          {item.rdo_atividades.length} registro(s)
                        </span>
                      </div>

                      {item.rdo_atividades.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {item.rdo_atividades.map((atv) => (
                            <button
                              key={`detail-${atv.id_atividade}`}
                              type="button"
                              onClick={() => setSelectedRdo(item)}
                              className={`grid gap-3 rounded-xl border p-3 text-left transition-all hover:border-[#364B59]/30 md:grid-cols-[120px_130px_1fr] ${isDarkMode ? "border-zinc-800 bg-zinc-900 hover:bg-zinc-800" : "border-zinc-100 bg-zinc-50 hover:bg-white hover:shadow-sm"}`}
                            >
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Data</p>
                                <p className={`mt-1 text-xs font-black ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                                  {item.data ? new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR") : "---"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nome</p>
                                <p className="mt-1 text-xs font-black text-[#364B59]">{atv.wbs}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Descrição</p>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-600">{atv.descricao || "Sem descrição"}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className={`rounded-xl border border-dashed px-4 py-3 text-xs font-bold ${isDarkMode ? "border-zinc-700 bg-zinc-900 text-zinc-500" : "border-zinc-200 bg-zinc-50 text-zinc-400"}`}>
                          Nenhum RDO lançado para esta OS.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          {osItems.length > pageSize && (
            <div className={`mt-6 flex items-center justify-between border-t px-1 pt-4 ${isDarkMode ? "border-zinc-800" : "border-zinc-100"}`}>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1 || osLoading}
                className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-30 ${isDarkMode ? "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800" : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"}`}
              >
                Anterior
              </button>

              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                Página {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages || osLoading}
                className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-30 ${isDarkMode ? "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800" : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"}`}
              >
                Próxima
              </button>
            </div>
          )}
        </section>
      </main>

      {selectedRdo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedRdo(null)}
        >
          <div
            className={`relative w-full max-w-4xl overflow-hidden rounded-[2rem] border shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)] ${isDarkMode ? "border-zinc-800 bg-zinc-950 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b px-8 py-6 ${isDarkMode ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-100 bg-zinc-50/70"}`}>
              <div>
                <h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? "text-zinc-100" : "text-zinc-900"}`}>Detalhes do RDO</h3>
                <p className={`mt-1 text-sm font-bold uppercase tracking-[0.2em] ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>OS {selectedRdo.os}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRdo(null)}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all active:scale-95 ${isDarkMode ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-8">
              <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-[#364B59]">Data do RDO</span>
                  <p className={`mt-2 text-xl font-bold ${isDarkMode ? "text-zinc-100" : "text-zinc-900"}`}>
                    {selectedRdo.data ? new Date(selectedRdo.data + "T12:00:00").toLocaleDateString("pt-BR") : "---"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-[#364B59]">Centro de Custo</span>
                  <p className={`mt-2 text-xl font-bold ${isDarkMode ? "text-zinc-100" : "text-zinc-900"}`}>CC {selectedRdo.cc}</p>
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-[#364B59]">Atividades</span>
                  <p className={`mt-2 text-xl font-bold ${isDarkMode ? "text-zinc-100" : "text-zinc-900"}`}>{selectedRdo.rdo_atividades.length}</p>
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-[#364B59]">Fotos</span>
                  <p className={`mt-2 text-xl font-bold ${isDarkMode ? "text-zinc-100" : "text-zinc-900"}`}>{selectedRdo.totalFotos}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className={`text-sm font-black uppercase tracking-[0.2em] ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>Atividades Relacionadas</h4>
                {selectedRdo.rdo_atividades.map((atv) => (
                  <div key={`modal-${atv.id_atividade}`} className={`flex flex-col gap-4 rounded-3xl border p-6 ${isDarkMode ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-100 bg-zinc-50"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-xl font-black text-[#364B59]">{atv.wbs}</span>
                        {atv.editado && (
                          <span className="w-fit rounded-md border border-[#F18213]/30 bg-[#F18213]/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-[#F18213]">
                            Editado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-lg px-3 py-1 text-xs font-black uppercase tracking-widest ${isDarkMode ? "bg-zinc-950 text-zinc-500" : "bg-white text-zinc-400"}`}>
                          {atv.fotos} FOT.
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteActivity(atv.id_atividade)}
                            disabled={deletingActivityId === atv.id_atividade}
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
                            title="Excluir atividade"
                          >
                            {deletingActivityId === atv.id_atividade ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className={`text-base font-medium leading-relaxed ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                      {atv.descricao || "Sem comentário"}
                    </p>

                    {atv.urls && atv.urls.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewingPhotos(atv.urls || null)}
                        className="mt-2 flex w-fit items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#364B59] hover:underline"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        Ver fotos desta atividade
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={`border-t p-8 ${isDarkMode ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-100 bg-zinc-50/70"}`}>
              <button
                type="button"
                onClick={() => setSelectedRdo(null)}
                className="w-full rounded-[1.5rem] bg-[#364B59] py-5 text-lg font-black text-white shadow-lg shadow-[#364B59]/20 transition-all hover:bg-[#2C3D47] active:scale-95"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingPhotos && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setViewingPhotos(null)}
        >
          <button
            type="button"
            onClick={() => setViewingPhotos(null)}
            className="absolute right-6 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>

          <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto px-2" onClick={(event) => event.stopPropagation()}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {viewingPhotos.map((url, index) => (
                <div key={url} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    className="h-auto max-h-[60vh] w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-xs font-bold uppercase tracking-widest text-white">Foto {index + 1} de {viewingPhotos.length}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
