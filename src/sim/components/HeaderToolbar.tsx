import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  Activity, 
  Sparkles, 
  Layers, 
  Trash2, 
  Download, 
  Upload,
  Camera,
  Menu,
  Calculator,
  FolderOpen,
  FilePlus,
  Zap,
  Factory,
  Network,
  ChevronDown
} from 'lucide-react';
import { PRESET_CIRCUITS, PresetCircuit } from '../presets';
import { PRESET_CIRCUITS_GTDC } from '../presets/gtdcPresets';
import { SystemMode } from '../schematic/types';

interface HeaderToolbarProps {
  isRunning: boolean;
  currentTime: number;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onBatchRun: () => void;
  onLoadPreset: (preset: PresetCircuit) => void;
  onClear: () => void;
  onNewProject?: () => void;
  onExport: () => void;
  onImport: () => void;
  isScopeOpen: boolean;
  onToggleScope: () => void;
  onOpenPhotoModal: () => void;
  onOpenImpedanceModal: () => void;
  onToggleMobilePalette: () => void;
  onOpenAnalysis?: () => void;
  onOpenLibrary?: () => void;
  onOpenAiSolve?: () => void;
  accountSlot?: React.ReactNode;
  systemMode?: SystemMode;
  onSelectSystemMode?: (mode: SystemMode) => void;
  onOpenPuModal?: () => void;
  onOpenYBusModal?: () => void;
  onOpenLtModal?: () => void;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  isRunning,
  currentTime,
  onToggleRun,
  onStep,
  onReset,
  onBatchRun,
  onLoadPreset,
  onClear,
  onNewProject,
  onExport,
  onImport,
  isScopeOpen,
  onToggleScope,
  onOpenPhotoModal,
  onOpenImpedanceModal,
  onToggleMobilePalette,
  onOpenAnalysis,
  onOpenLibrary,
  onOpenAiSolve,
  accountSlot,
  systemMode = 'circuitos_ii',
  onSelectSystemMode,
  onOpenPuModal,
  onOpenYBusModal,
  onOpenLtModal
}) => {
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const presetsMenuRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns se clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setIsProjectMenuOpen(false);
      }
      if (presetsMenuRef.current && !presetsMenuRef.current.contains(e.target as Node)) {
        setIsPresetsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-2 sm:px-3 flex items-center justify-between select-none z-30 shadow-lg gap-1.5 sm:gap-2">
      {/* Esquerda: Menu Mobile + Logotipo PLECS + Seletor de Modo */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Botão gaveta mobile */}
        <button
          onClick={onToggleMobilePalette}
          className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          title="Abrir Componentes"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Logotipo com Ícone do Modo Atual */}
        <div className="flex items-center gap-1.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-md shrink-0 ${
            systemMode === 'gtdc'
              ? 'bg-gradient-to-tr from-amber-600 to-emerald-400 shadow-amber-500/20'
              : 'bg-gradient-to-tr from-cyan-600 to-sky-400 shadow-cyan-500/20'
          }`}>
            {systemMode === 'gtdc' ? (
              <Factory className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            ) : (
              <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <span className="font-black tracking-wider text-sm bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              PLECS
            </span>
            <span className={`text-[9px] font-extrabold px-1 py-0.2 rounded border ${
              systemMode === 'gtdc'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
            }`}>
              {systemMode === 'gtdc' ? 'GTDC' : 'STUDIO'}
            </span>
          </div>
        </div>

        {/* Seletor Compacto de Modo: Circuitos II vs GTDC / SEP */}
        {onSelectSystemMode && (
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => onSelectSystemMode('circuitos_ii')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${
                systemMode === 'circuitos_ii'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Modo Circuitos II: Análise CA, Fasores, RLC, Zab"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Circuitos II</span>
              <span className="md:hidden">Circ. II</span>
            </button>

            <button
              onClick={() => onSelectSystemMode('gtdc')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${
                systemMode === 'gtdc'
                  ? 'bg-gradient-to-r from-amber-500/25 to-emerald-500/25 text-amber-300 border border-amber-500/50 shadow-md shadow-amber-500/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Modo GTDC / SEP: Potência, PU, Ybarra, Linhas de Transmissão"
            >
              <Factory className="w-3.5 h-3.5 text-amber-400" />
              <span>GTDC</span>
            </button>
          </div>
        )}

        {/* Botão Novo Projeto Rápido (em telas ultra-largas) */}
        <button
          onClick={onNewProject || onClear}
          className="hidden 2xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 text-xs font-semibold border border-slate-700 hover:border-cyan-500/40 transition-all shrink-0"
          title="Iniciar novo projeto em branco"
        >
          <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
          <span>Novo</span>
        </button>
      </div>

      {/* Centro: Controles de Simulação Compactos */}
      <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 sm:p-1 rounded-xl border border-slate-800 shrink-0">
        {/* Play/Pause */}
        <button
          onClick={onToggleRun}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg font-bold text-xs shadow-md transition-all ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20'
          }`}
          title={isRunning ? 'Pausar Simulação em Tempo Real' : 'Iniciar Simulação Interativa'}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span className="hidden xs:inline">Pausar</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden xs:inline">Play</span>
            </>
          )}
        </button>

        {/* Simulação em Bloco PLECS */}
        <button
          onClick={onBatchRun}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-colors"
          title="Executar análise transiente para o osciloscópio"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">PLECS</span>
        </button>

        {/* Passo e Reset */}
        <button
          onClick={onStep}
          disabled={isRunning}
          className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-40"
          title="Avançar 1 passo (dt)"
        >
          <StepForward className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onReset}
          className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          title="Zerar tempo e estados"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Display de Tempo (apenas telas médias/grandes) */}
        <div className="hidden xl:flex px-2 py-0.5 bg-slate-900 border border-slate-800/80 rounded-lg items-center gap-1 font-mono text-xs">
          <span className="text-slate-500 text-[10px]">t=</span>
          <span className="text-cyan-400 font-semibold min-w-[52px] text-[11px]">
            {currentTime >= 1
              ? `${currentTime.toFixed(3)}s`
              : `${(currentTime * 1e3).toFixed(2)}ms`}
          </span>
        </div>
      </div>

      {/* Direita: Ferramentas do Modo + Resolução + Presets + Scope + Arquivo + Conta */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* FERRAMENTAS ESPECÍFICAS DO MODO SELECIONADO */}
        {systemMode === 'gtdc' ? (
          <div className="flex items-center bg-slate-950/70 p-0.5 rounded-lg border border-amber-500/30 shrink-0">
            {onOpenPuModal && (
              <button
                onClick={onOpenPuModal}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all"
                title="Abrir Análise e Mudança de Bases em Por Unidade (PU)"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">PU</span>
              </button>
            )}
            {onOpenYBusModal && (
              <button
                onClick={onOpenYBusModal}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition-all"
                title="Abrir Matriz de Admitâncias Ybarra e Zbarra"
              >
                <Network className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Ybarra</span>
              </button>
            )}
            {onOpenLtModal && (
              <button
                onClick={onOpenLtModal}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs font-bold text-pink-300 hover:bg-pink-500/20 transition-all"
                title="Abrir Análise de Linhas de Transmissão (LT, Ferranti e Compensação)"
              >
                <Activity className="w-3.5 h-3.5 text-pink-400" />
                <span className="hidden sm:inline">LT</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center bg-slate-950/70 p-0.5 rounded-lg border border-cyan-500/30 shrink-0">
            <button
              onClick={onOpenImpedanceModal}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
              title="Calcular Impedância Equivalente Zab nos terminais a e b"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Zab</span>
            </button>
            <button
              onClick={onOpenPhotoModal}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition-all"
              title="Importar circuito por foto / câmera"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Foto</span>
            </button>
          </div>
        )}

        {/* GRUPO DE RESOLUÇÃO (IA + LISTAS) */}
        <div className="flex items-center bg-slate-950/70 p-0.5 rounded-lg border border-slate-800 shrink-0">
          {onOpenAiSolve && (
            <button
              onClick={onOpenAiSolve}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs font-bold bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 hover:from-fuchsia-500/30 hover:to-cyan-500/30 text-fuchsia-300 transition-all"
              title="Resolver com Inteligência Artificial com base no circuito montado"
            >
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              <span className="hidden md:inline">IA</span>
            </button>
          )}

          {onOpenAnalysis && (
            <button
              onClick={onOpenAnalysis}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all"
              title="Resolver exercícios com cálculo completo passo a passo (Listas 1 a 6)"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Listas</span>
            </button>
          )}
        </div>

        {/* DROPDOWN DE EXEMPLOS E PRESETS */}
        <div className="relative shrink-0" ref={presetsMenuRef}>
          <button
            onClick={() => setIsPresetsOpen(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              systemMode === 'gtdc'
                ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 border-amber-500/40'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={systemMode === 'gtdc' ? 'Sistemas Prontos de GTDC / SEP' : 'Circuitos de Exemplo'}
          >
            <Layers className={`w-3.5 h-3.5 ${systemMode === 'gtdc' ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span className="hidden md:inline">
              {systemMode === 'gtdc' ? 'Sistemas' : 'Exemplos'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isPresetsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                systemMode === 'gtdc' ? 'text-amber-400' : 'text-slate-400'
              }`}>
                {systemMode === 'gtdc' ? 'Sistemas Prontos de GTDC / SEP' : 'Circuitos Prontos'}
              </div>
              {(systemMode === 'gtdc' ? PRESET_CIRCUITS_GTDC : PRESET_CIRCUITS).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setIsPresetsOpen(false);
                    onLoadPreset(p);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-colors group/item"
                >
                  <div className={`font-medium text-xs text-slate-200 ${
                    systemMode === 'gtdc' ? 'group-hover/item:text-amber-300' : 'group-hover/item:text-cyan-300'
                  }`}>
                    {p.name}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* OSCILOSCÓPIO SCOPE */}
        <button
          onClick={onToggleScope}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            isScopeOpen
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
          title="Exibir / Ocultar Osciloscópio Multicanal PLECS"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Scope</span>
        </button>

        {/* MENU PROJETO / ARQUIVO UNIFICADO (Elimina a necessidade de rolagem horizontal) */}
        <div className="relative shrink-0" ref={projectMenuRef}>
          <button
            onClick={() => setIsProjectMenuOpen(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isProjectMenuOpen
                ? 'bg-slate-700 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Menu de Projeto e Arquivo (Novo, Salvar, Abrir, Exportar, Importar, Limpar)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Arquivo</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProjectMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Projeto & Esquemático
              </div>

              {/* Novo Projeto */}
              <button
                onClick={() => {
                  setIsProjectMenuOpen(false);
                  (onNewProject || onClear)();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:text-white hover:bg-slate-800 transition-colors text-left"
              >
                <FilePlus className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-semibold">Novo Projeto</div>
                  <div className="text-[10px] text-slate-400">Limpar canvas e começar do zero</div>
                </div>
              </button>

              {/* Meus Circuitos */}
              {onOpenLibrary && (
                <button
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onOpenLibrary();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:text-white hover:bg-slate-800 transition-colors text-left"
                >
                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Meus Circuitos Salvos</div>
                    <div className="text-[10px] text-slate-400">Acessar circuitos salvos na conta</div>
                  </div>
                </button>
              )}

              <div className="h-[1px] bg-slate-800 my-1" />

              {/* Exportar JSON */}
              <button
                onClick={() => {
                  setIsProjectMenuOpen(false);
                  onExport();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:text-white hover:bg-slate-800 transition-colors text-left"
              >
                <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold">Exportar Circuito (JSON)</div>
                  <div className="text-[10px] text-slate-400">Salvar arquivo local no PC</div>
                </div>
              </button>

              {/* Importar JSON */}
              <button
                onClick={() => {
                  setIsProjectMenuOpen(false);
                  onImport();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:text-white hover:bg-slate-800 transition-colors text-left"
              >
                <Upload className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="font-semibold">Importar Circuito (JSON)</div>
                  <div className="text-[10px] text-slate-400">Carregar arquivo esquemático</div>
                </div>
              </button>

              <div className="h-[1px] bg-slate-800 my-1" />

              {/* Limpar Tudo */}
              <button
                onClick={() => {
                  setIsProjectMenuOpen(false);
                  (onNewProject || onClear)();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 transition-colors text-left"
              >
                <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-semibold text-rose-300">Limpar Esquemático</div>
                  <div className="text-[10px] text-rose-400/80">Remover todos os componentes e fios</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Conta do Usuário */}
        {accountSlot}
      </div>
    </header>
  );
};
