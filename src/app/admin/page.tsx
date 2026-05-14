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

export default function AdminDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'users'>('logs');
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const supabase = createSupabaseBrowserClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch Logs
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Fetch Authorized Users
      const { data: usersData } = await supabase
        .from('authorized_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsData) setLogs(logsData);
      if (usersData) setUsers(usersData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  }, [supabase]);

  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          setUserRole(profile.role);
        } else if (user.email === 'wladmir.carmo@estaleiromaua.ind.br') {
          setUserRole('owner');
        }
      }
    };
    getRole();
    fetchData();
    const saved = localStorage.getItem("rdo-theme");
    if (saved) setIsDarkMode(saved === "dark");
  }, [fetchData, supabase]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("rdo-theme", next ? "dark" : "light");
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    const { error } = await supabase
      .from('authorized_users')
      .insert({ email: newEmail, role: newRole });

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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900"}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md ${isDarkMode ? "bg-zinc-950/80 border-zinc-800" : "bg-white/80 border-zinc-200"}`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:h-20">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-xl hover:bg-zinc-800 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Painel Admin</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800">
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? "bg-[#2868A0] text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Logs de Atividade
              </button>
              {userRole === 'owner' && (
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? "bg-[#2868A0] text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Gestão de Usuários
                </button>
              )}
            </div>

            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                isDarkMode 
                ? "bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800" 
                : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-100 shadow-sm"
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

            <div className={`w-full rounded-[2rem] border overflow-x-auto ${isDarkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-zinc-200 shadow-xl"}`}>
              <table className="w-full min-w-[1200px] text-left border-collapse">
                <thead>
                  <tr className={`border-b ${isDarkMode ? "border-zinc-800 bg-zinc-900/50" : "bg-zinc-50 border-zinc-200"}`}>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Evento</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Usuário</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Detalhes</th>
                    <th className="px-4 pr-12 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-4 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                          log.action_type === 'LOGIN' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                          log.action_type === 'LOGOUT' ? "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20" :
                          log.action_type === 'RDO_EDIT' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                          "bg-[#2868A0]/10 text-[#2868A0] border border-[#2868A0]/20"
                        }`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <div className="font-bold text-sm">{log.user_email}</div>
                        <div className="text-[10px] text-zinc-600 font-mono">{log.ip_address}</div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="text-xs text-zinc-400">
                          {log.action_type === 'RDO_UPLOAD' || log.action_type === 'RDO_EDIT' ? (
                            `CC ${log.details?.cc} | OS ${log.details?.os} | ${log.details?.photos_count} fotos`
                          ) : log.details?.method || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 pr-12 py-6 text-right">
                        <div className="text-sm font-bold">{new Date(log.created_at).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs text-zinc-500">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <div className="h-2 w-2 rounded-full bg-[#2868A0] animate-pulse" />
                Autorizar Novo E-mail
              </h3>
              <div className="flex gap-4">
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="exemplo@estaleiromaua.ind.br"
                  className={`flex-1 rounded-2xl border px-6 py-4 text-lg font-bold outline-none focus:ring-4 focus:ring-[#2868A0]/10 transition-all ${isDarkMode ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
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
                <button type="submit" className="bg-[#2868A0] text-white px-8 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#1f5f8c] transition-all active:scale-95 shadow-lg shadow-[#2868A0]/30">
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
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl ${user.role === 'admin' || user.role === 'owner' ? "bg-[#2868A0] text-white" : "bg-zinc-800 text-zinc-500"}`}>
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{user.email}</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' || user.role === 'owner' ? "text-[#2868A0]" : "text-zinc-500"}`}>
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
