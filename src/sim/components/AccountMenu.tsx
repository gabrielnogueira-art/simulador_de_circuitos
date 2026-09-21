import React from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "../hooks/useAuthSession";

export const AccountMenu: React.FC = () => {
  const { user, loading } = useAuthSession();

  if (loading) return null;

  if (!user) {
    return (
      <a
        href="/auth"
        className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700"
        title="Entrar na sua conta"
      >
        <LogIn className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Entrar</span>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden lg:flex items-center gap-1.5 rounded-lg bg-slate-800/70 px-2.5 py-1.5 text-[11px] text-slate-300 border border-slate-700 max-w-[160px]">
        <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="truncate">{user.email}</span>
      </span>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
        }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
        title="Sair da conta"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};
