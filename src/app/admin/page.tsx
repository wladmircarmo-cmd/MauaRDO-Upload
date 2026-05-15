"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import Link from "next/link";

interface AuditLog {
  id: string;
  user_email: string;
  action_type: string;
  created_at: string;
  ip_address: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
}

interface AuthorizedUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface ExternalCc {
  cod_ccusto: string;
  descr_ccusto: string;
  status: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  show_in_app: boolean | null;
  updated_at: string;
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [ccs, setCcs] = useState<ExternalCc[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'ccs'>('logs');
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [ccSearch, setCcSearch] = useState("");
  const [ccPage, setCcPage] = useState(1);
  const [savingCc, setSavingCc] = useState<string | null>(null);
  const itemsPerPage = 10;
  const ccsPerPage = 10;
  
  const supabase = createSupabaseBrowserClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch Logs with Pagination
      const from = currentPage * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      
      // Fetch Authorized Users (todos)
      const { data: usersData } = await supabase
        .from('authorized_users')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: ccsData } = await supabase
        .from('external_ccs')
        .select('cod_ccusto, descr_ccusto, status, data_inicio, data_fim, show_in_app, updated_at')
        .order('descr_ccusto', { ascending: true });

      if (logsData) setLogs(logsData);
      if (usersData) setUsers(usersData);
      if (ccsData) setCcs(ccsData as ExternalCc[]);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  }, [supabase, currentPage]);
 
  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userEmail = (user.email || '').trim().toLowerCase();
        const { data: authUser } = await supabase
          .from('authorized_users')
          .select('role')
          .ilike('email', userEmail)
          .maybeSingle();

        if (authUser?.role) {
          setUserRole(authUser.role);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          setUserRole(profile.role);
        } else if (userEmail === 'wladmir.carmo@estaleiromaua.ind.br') {
          setUserRole('owner');
        }
      }
    };
    getRole();
    fetchData();
    const saved = localStorage.getItem("rdo-theme");
    setIsDarkMode(saved === "dark");
  }, [fetchData, supabase]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("rdo-theme", next ? "dark" : "light");
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    const { error } = await supabase
      .from('authorized_users')
      .insert({ email, role: newRole });

    if (error) {
      alert("Erro ao adicionar usuário: " + error.message);
    } else {
      setNewEmail("");
      fetchData();
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este acesso?")) return;
    const { error } = await supabase.from('authorized_users').delete().eq('id', id);
    if (!error) fetchData();
  };

  const handleToggleCc = async (codCcusto: string, showInApp: boolean) => {
    setSavingCc(codCcusto);
    const { error } = await supabase
      .from('external_ccs')
      .update({ show_in_app: showInApp })
      .eq('cod_ccusto', codCcusto);

    if (error) {
      alert("Erro ao atualizar CC: " + error.message);
    } else {
      setCcs((current) =>
        current.map((cc) => (cc.cod_ccusto === codCcusto ? { ...cc, show_in_app: showInApp } : cc)),
      );
    }
    setSavingCc(null);
  };

  const visibleCcs = ccs.filter((cc) => cc.show_in_app);
  const filteredCcs = ccs.filter((cc) => {
    const query = ccSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      cc.cod_ccusto.toLowerCase().includes(query) ||
      cc.descr_ccusto.toLowerCase().includes(query) ||
      (cc.status || '').toLowerCase().includes(query)
    );
  });
  const ccTotalPages = Math.max(1, Math.ceil(filteredCcs.length / ccsPerPage));
  const paginatedCcs = filteredCcs.slice((ccPage - 1) * ccsPerPage, ccPage * ccsPerPage);

  useEffect(() => {
    setCcPage(1);
  }, [ccSearch]);

  useEffect(() => {
    if (ccPage > ccTotalPages) {
      setCcPage(ccTotalPages);
    }
  }, [ccPage, ccTotalPages]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900"}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md ${isDarkMode ? "bg-zinc-950/85 border-zinc-800" : "bg-white/90 border-zinc-200"}`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className={`grid h-11 w-11 place-items-center rounded-2xl border transition-all active:scale-95 ${isDarkMode ? "border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800" : "border-zinc-200 bg-white text-[#364B59] shadow-sm hover:bg-zinc-50"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F18213]">Maua RDO</p>
              <h1 className="text-2xl font-black tracking-tight uppercase">Painel Admin</h1>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-1 rounded-2xl border p-1 shadow-sm ${isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-100"}`}>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? "bg-[#364B59] text-white shadow-md" : isDarkMode ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" : "text-zinc-500 hover:bg-white hover:text-[#364B59]"}`}
              >
                Logs
              </button>
              <button 
                onClick={() => setActiveTab('ccs')}
                className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'ccs' ? "bg-[#364B59] text-white shadow-md" : isDarkMode ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" : "text-zinc-500 hover:bg-white hover:text-[#364B59]"}`}
              >
                Centros de Custo
              </button>
              {userRole === 'owner' && (
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? "bg-[#364B59] text-white shadow-md" : isDarkMode ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" : "text-zinc-500 hover:bg-white hover:text-[#364B59]"}`}
                >
                  Gestão de Usuários
                </button>
              )}
            </div>

            <button
              onClick={toggleTheme}
              className={`grid h-11 w-11 place-items-center rounded-2xl border transition-all active:scale-95 ${
                isDarkMode 
                ? "bg-zinc-900 border-zinc-800 text-[#F18213] hover:bg-zinc-800" 
                : "bg-white border-zinc-200 text-[#364B59] hover:bg-zinc-50 shadow-sm"
              }`}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {activeTab === 'logs' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-black tracking-tight">Logs do Sistema</h2>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">Monitoramento em tempo real</p>
              </div>
              <button onClick={fetchData} className="p-3 rounded-2xl border border-zinc-800 hover:bg-zinc-900 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              </button>
            </div>

            <div className={`w-full rounded-[2rem] border overflow-hidden ${isDarkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-zinc-200 shadow-xl"}`}>
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className={`border-b ${isDarkMode ? "border-zinc-800 bg-zinc-900/50" : "bg-zinc-50 border-zinc-200"}`}>
                    <th className="px-4 py-5 w-[100px] text-[10px] font-black uppercase tracking-widest text-zinc-500 text-left">Evento</th>
                    <th className="px-4 py-5 w-[250px] text-[10px] font-black uppercase tracking-widest text-zinc-500 text-left">Usuário</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-left">Detalhes</th>
                    <th className="px-4 py-5 w-[150px] text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-4 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                          log.action_type === 'LOGIN' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          log.action_type === 'LOGOUT' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
                          log.action_type === 'RDO_EDIT' ? 'bg-[#F18213]/10 text-[#F18213] border-[#F18213]/20' :
                          log.action_type === 'RDO_DELETE' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          log.action_type === 'RDO_UPLOAD' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                          'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                        }`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <div className={`font-bold text-xs ${isDarkMode ? "text-white" : "text-black"}`}>{log.user_email}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{log.ip_address}</div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="text-xs text-zinc-400">
                          {log.action_type === 'RDO_UPLOAD' || log.action_type === 'RDO_EDIT' || log.action_type === 'RDO_DELETE' ? (
                            `CC ${log.details?.cc} | OS ${log.details?.os} | ${log.details?.photos_count} fotos`
                          ) : log.details?.method || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-6 text-right whitespace-nowrap">
                        <div className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-black"}`}>
                          {new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Paginação */}
              <div className="px-4 py-4 border-t border-zinc-800/50 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 text-[10px] font-black tracking-widest uppercase border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <span className="text-[10px] font-black tracking-widest uppercase text-zinc-500">
                  Página {currentPage + 1}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={logs.length < itemsPerPage}
                  className="px-4 py-2 text-[10px] font-black tracking-widest uppercase border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'ccs' ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black tracking-tight">Centros de Custo</h2>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">
                  Escolha quais CCs aparecem no upload e na consulta
                </p>
              </div>
              <div className={`px-5 py-3 rounded-2xl border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ativos</span>
                <strong className="ml-3 text-lg font-black text-[#F18213]">{visibleCcs.length}</strong>
                <span className="ml-1 text-xs font-bold text-zinc-500">/ {ccs.length}</span>
              </div>
            </div>

            <div className={`rounded-[2rem] border overflow-hidden ${isDarkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-zinc-200 shadow-xl"}`}>
              <div className={`p-5 border-b ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                <input
                  value={ccSearch}
                  onChange={(event) => setCcSearch(event.target.value)}
                  placeholder="Buscar por CC, descrição ou status"
                  className={`w-full rounded-2xl border px-5 py-4 font-bold outline-none transition-all focus:ring-4 focus:ring-[#364B59]/10 ${
                    isDarkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                  }`}
                />
              </div>

              <div className="divide-y divide-zinc-800/20">
                {paginatedCcs.map((cc) => {
                  const enabled = Boolean(cc.show_in_app);
                  const saving = savingCc === cc.cod_ccusto;

                  return (
                    <div key={cc.cod_ccusto} className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? "hover:bg-zinc-950/50" : "hover:bg-zinc-50"}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-black uppercase tracking-widest text-[#364B59]">CC {cc.cod_ccusto}</span>
                          {cc.status && (
                            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500"}`}>
                              {cc.status}
                            </span>
                          )}
                          {enabled && (
                            <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                              Visível
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-lg font-black truncate">{cc.descr_ccusto}</h3>
                        <p className="mt-1 text-[11px] font-bold text-zinc-500">
                          {cc.data_inicio ? new Date(`${cc.data_inicio}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem início'} até {cc.data_fim ? new Date(`${cc.data_fim}T00:00:00`).toLocaleDateString('pt-BR') : 'sem fim'}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleToggleCc(cc.cod_ccusto, !enabled)}
                        className={`relative h-9 w-16 shrink-0 rounded-full border transition-all active:scale-95 disabled:opacity-60 ${
                          enabled
                            ? "bg-[#F18213] border-[#F18213]"
                            : isDarkMode
                              ? "bg-zinc-950 border-zinc-700"
                              : "bg-zinc-100 border-zinc-200"
                        }`}
                        aria-label={enabled ? "Ocultar CC" : "Exibir CC"}
                      >
                        <span
                          className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-md transition-all ${
                            enabled ? "left-8" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}

                {filteredCcs.length === 0 && (
                  <div className="p-10 text-center text-sm font-bold text-zinc-500">
                    Nenhum centro de custo encontrado.
                  </div>
                )}
              </div>

              {filteredCcs.length > 0 && (
                <div className={`px-5 py-4 border-t flex items-center justify-between gap-3 ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                  <button
                    onClick={() => setCcPage((page) => Math.max(1, page - 1))}
                    disabled={ccPage === 1}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                      isDarkMode ? "border-zinc-800 hover:bg-zinc-800" : "border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    Anterior
                  </button>

                  <div className="text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Página {ccPage} de {ccTotalPages}
                    </div>
                    <div className="mt-0.5 text-[10px] font-bold text-zinc-400">
                      {filteredCcs.length} CCs encontrados
                    </div>
                  </div>

                  <button
                    onClick={() => setCcPage((page) => Math.min(ccTotalPages, page + 1))}
                    disabled={ccPage === ccTotalPages}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                      isDarkMode ? "border-zinc-800 hover:bg-zinc-800" : "border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    Próximo
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : userRole === 'owner' ? (
          <div className="max-w-4xl mx-auto space-y-12">
            <div>
              <h2 className="text-4xl font-black tracking-tight">Gestão de Usuários</h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">Controle de acesso à plataforma</p>
            </div>

            {/* Form de Adição */}
            <form onSubmit={handleAddUser} className={`p-10 rounded-[2.5rem] border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-2xl"}`}>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-[#364B59] animate-pulse" />
                Autorizar Novo E-mail
              </h3>
              <div className="flex gap-4">
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="exemplo@estaleiromaua.ind.br"
                  className={`flex-1 rounded-2xl border px-6 py-4 text-lg font-bold outline-none focus:ring-4 focus:ring-[#364B59]/10 transition-all ${isDarkMode ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
                />
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className={`rounded-2xl border px-6 py-4 font-bold outline-none ${isDarkMode ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
                >
                  <option value="planejador">Planejador</option>
                  <option value="assistente de planejamento">Assistente de Planejamento</option>
                  <option value="auxiliar de planejamento">Auxiliar de Planejamento</option>
                  <option value="consulta">Consulta (Leitura)</option>
                  <option value="admin">Administrador</option>
                </select>
                <button type="submit" className="bg-[#364B59] text-white px-8 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#2C3D47] transition-all active:scale-95 shadow-lg shadow-[#364B59]/30">
                  Autorizar
                </button>
              </div>
            </form>

            {/* Lista de Usuários */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 px-4">Usuários Autorizados</h3>
              <div className="grid gap-3">
                {users.map((user) => (
                  <div key={user.id} className={`flex items-center justify-between p-6 rounded-3xl border transition-all ${isDarkMode ? "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700" : "bg-white border-zinc-200 hover:shadow-md"}`}>
                    <div className="flex items-center gap-6">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl ${user.role === 'admin' || user.role === 'owner' ? "bg-[#364B59] text-white" : "bg-zinc-800 text-zinc-500"}`}>
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{user.email}</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' || user.role === 'owner' ? "text-[#364B59]" : "text-zinc-500"}`}>
                          {user.role}
                        </div>
                      </div>
                    </div>
                    {user.role !== 'owner' && (
                      <button 
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
