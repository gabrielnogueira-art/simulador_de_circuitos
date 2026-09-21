import React, { useCallback, useEffect, useState } from "react";
import { CloudUpload, FolderOpen, Loader2, LogIn, Trash2, X, RefreshCw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CircuitComponent, Wire } from "../schematic/types";
import { useAuthSession } from "../hooks/useAuthSession";
import { GoogleIcon } from "./GoogleIcon";
import { lovable } from "@/integrations/lovable";

interface SavedCircuit {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  data: { components: CircuitComponent[]; wires: Wire[] };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
  wires: Wire[];
  currentSavedCircuit?: { id: string; name: string } | null;
  onLoad: (components: CircuitComponent[], wires: Wire[], meta?: { id: string; name: string }) => void;
  onGoToAuth: () => void;
}

export const CircuitLibraryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  components,
  wires,
  currentSavedCircuit,
  onLoad,
  onGoToAuth,
}) => {
  const { user, loading: authLoading } = useAuthSession();
  const [items, setItems] = useState<SavedCircuit[]>([]);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("circuits")
      .select("id, name, description, updated_at, data")
      .order("updated_at", { ascending: false });
    setBusy(false);
    if (error) {
      setMessage("Não foi possível carregar seus circuitos: " + error.message);
      return;
    }
    setItems((data ?? []) as unknown as SavedCircuit[]);
  }, [user]);

  useEffect(() => {
    if (isOpen && user) void refresh();
  }, [isOpen, user, refresh]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      setMessage("Dê um nome ao circuito antes de salvar.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("circuits").insert({
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      data: { components, wires } as never,
    });
    setBusy(false);
    if (error) {
      setMessage("Erro ao salvar: " + error.message);
      return;
    }
    setMessage(`"${name.trim()}" salvo na sua conta.`);
    setName("");
    setDescription("");
    void refresh();
  };

  const handleOverwrite = async (circuitId: string, circuitName: string) => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("circuits")
      .update({
        data: { components, wires } as never,
        updated_at: new Date().toISOString(),
      })
      .eq("id", circuitId);
    setBusy(false);
    if (error) {
      setMessage("Erro ao atualizar o circuito: " + error.message);
      return;
    }
    setMessage(`Alterações no circuito "${circuitName}" salvas com sucesso! (${components.length} blocos, ${wires.length} ligações)`);
    void refresh();
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.from("circuits").delete().eq("id", id);
    setBusy(false);
    if (error) {
      setMessage("Erro ao apagar: " + error.message);
      return;
    }
    void refresh();
  };

  const handleSignInWithGoogle = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setBusy(false);
        setMessage("Não foi possível conectar com o Google: " + String(result.error));
        return;
      }
      if (result.redirected) return;
      setBusy(false);
    } catch (err: unknown) {
      setBusy(false);
      setMessage("Erro ao iniciar login com o Google: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">Meus circuitos salvos</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {user && (
              <button onClick={() => void refresh()} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {authLoading ? (
          <div className="p-8 flex items-center justify-center text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando sua conta...
          </div>
        ) : !user ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Entre na sua conta para guardar seus circuitos e abri-los em qualquer aparelho.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSignInWithGoogle}
                disabled={busy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 hover:border-slate-600 text-xs font-semibold shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <GoogleIcon className="w-4 h-4 shrink-0" />}
                Entrar com Google
              </button>
              <button
                type="button"
                onClick={onGoToAuth}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> Entrar com e-mail
              </button>
            </div>
            {message && (
              <p className="mt-2 text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/40 px-3 py-1.5 rounded-lg inline-block">
                {message}
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentSavedCircuit && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/50 shadow-md">
                <div className="min-w-0">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    Circuito Aberto Atualmente
                  </div>
                  <div className="text-xs font-bold text-slate-100 truncate">{currentSavedCircuit.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Clique ao lado para salvar suas novas edições por cima deste circuito.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleOverwrite(currentSavedCircuit.id, currentSavedCircuit.name)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar Alterações
                </button>
              </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
              <div className="text-[11px] font-bold text-slate-200">Salvar como novo circuito</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome (ex.: Lista 2 — questão 2.5)"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Observação (opcional)"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => void handleSave()}
                disabled={busy}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-[11px] font-bold hover:bg-emerald-400 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                Salvar na minha conta
              </button>
              <p className="text-[10px] text-slate-500">
                {components.length} blocos e {wires.length} ligações serão guardados.
              </p>
            </div>

            {message && <div className="rounded-lg bg-slate-800/70 px-3 py-2 text-[11px] text-slate-200">{message}</div>}

            <div className="space-y-2">
              {items.length === 0 && <p className="text-[11px] text-slate-500">Você ainda não salvou nenhum circuito.</p>}
              {items.map((it) => (
                <div key={it.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-100">{it.name}</div>
                    <div className="truncate text-[10px] text-slate-400">
                      {it.description || "—"} · {new Date(it.updated_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => void handleOverwrite(it.id, it.name)}
                      disabled={busy}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/30 transition-colors cursor-pointer"
                      title={`Sobrescrever "${it.name}" com o circuito atual da tela`}
                    >
                      Salvar Alterações
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLoad(it.data.components ?? [], it.data.wires ?? [], { id: it.id, name: it.name });
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-[11px] font-semibold hover:bg-cyan-500/30 cursor-pointer"
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(it.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
