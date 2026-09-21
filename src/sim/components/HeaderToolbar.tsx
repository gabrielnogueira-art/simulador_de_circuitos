import React from 'react';
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
  Network
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
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between select-none z-10 shadow-lg gap-2 overflow-x-auto">
      {/* Esquerda: Botão Menu Mobile + Logotipo PLECS + Botão Novo Projeto */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Botão para abrir gaveta de componentes no celular */}
        <button
          onClick={onToggleMobilePalette}
          className="sm:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          title="Abrir Biblioteca de Blocos"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shrink-0 ${
            systemMode === 'gtdc'
              ? 'bg-gradient-to-tr from-amber-600 to-emerald-400 shadow-amber-500/20'
              : 'bg-gradient-to-tr from-cyan-600 to-sky-400 shadow-cyan-500/20'
          }`}>
            {systemMode === 'gtdc' ? (
              <Factory className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
            ) : (
              <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            )}
          </div>
          <div className="hidden xs:block">
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-wider text-sm sm:text-base bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                PLECS
              </span>
              {systemMode === 'gtdc' ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  GTDC • SEP
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  STUDIO
                </span>
              )}
            </div>
            <p className="hidden md:block text-[10px] text-slate-400 font-medium -mt-0.5">
              {systemMode === 'gtdc'
                ? 'Sistemas Elétricos de Potência'
                : 'Simulador de Potência & Circuitos'}
            </p>
          </div>
        </div>

        {/* Seletor Visual de Modo: Circuitos II vs GTDC / SEP */}
        {onSelectSystemMode && (
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => onSelectSystemMode('circuitos_ii')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                systemMode === 'circuitos_ii'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mudar para Modo Circuitos II: Análise CA, Fasores, RLC, Impedância Zab e Laplace"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Circuitos II</span>
              <span className="sm:hidden">Circ. II</span>
            </button>

            <button
              onClick={() => onSelectSystemMode('gtdc')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                systemMode === 'gtdc'
                  ? 'bg-gradient-to-r from-amber-500/25 to-emerald-500/25 text-amber-300 border border-amber-500/50 shadow-md shadow-amber-500/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mudar para Sistema Focado em GTDC / SEP (Sistemas Elétricos de Potência, PU, Ybarra, Linhas de Transmissão e Compensação)"
            >
              <Factory className="w-3.5 h-3.5 text-amber-400" />
              <span>GTDC / SEP</span>
            </button>
          </div>
        )}

        {/* Botão NOVO PROJETO */}
        <button
          onClick={onNewProject || onClear}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 text-xs font-semibold border border-slate-700 hover:border-cyan-500/50 transition-all shadow-sm shrink-0"
          title="Iniciar um novo circuito limpo do zero"
        >
          <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xs:inline">Novo Projeto</span>
          <span className="xs:hidden">Novo</span>
        </button>
      </div>

      {/* Centro: Controles Principais de Simulação */}
      <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
        {/* Play/Pause Interativo em Tempo Real */}
        <button
          onClick={onToggleRun}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all ${
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
              <span className="hidden xs:inline">Tempo Real</span>
            </>
          )}
        </button>

        {/* Simulação em Bloco (PLECS Transient Run) */}
        <button
          onClick={onBatchRun}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-colors"
          title="Executar análise transiente para o osciloscópio"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Simulação PLECS</span>
        </button>

        {/* Passo e Reset */}
        <button
          onClick={onStep}
          disabled={isRunning}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-40"
          title="Avançar 1 passo (dt)"
        >
          <StepForward className="w-4 h-4" />
        </button>

        <button
          onClick={onReset}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          title="Zerar tempo e estados"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Display de Tempo */}
        <div className="hidden sm:flex px-2.5 py-1 bg-slate-900 border border-slate-800/80 rounded-lg items-center gap-1.5 font-mono text-xs">
          <span className="text-slate-500">t=</span>
          <span className="text-cyan-400 font-semibold min-w-[65px]">
            {currentTime >= 1
              ? `${currentTime.toFixed(3)}s`
              : `${(currentTime * 1e3).toFixed(2)}ms`}
          </span>
        </div>
      </div>

      {/* Direita: Foto/Câmera, Exemplos, Scope & Ferramentas */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Resolução analítica passo a passo (listas 1 a 6) */}
        {onOpenAiSolve && (
          <button
            onClick={onOpenAiSolve}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-fuchsia-500/20 hover:from-fuchsia-400 hover:to-cyan-300 transition-all"
            title="Resolver com IA o que a questão pede, com base no circuito montado"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">IA</span>
          </button>
        )}

        {onOpenAnalysis && (
          <button
            onClick={onOpenAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all"
            title="Resolver exercícios com cálculo completo passo a passo"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resolver</span>
          </button>
        )}

        {/* Circuitos salvos na conta */}
        {onOpenLibrary && (
          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            title="Salvar ou abrir circuitos guardados na sua conta"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Meus circuitos</span>
          </button>
        )}

        {accountSlot}

        {/* FERRAMENTAS ESPECÍFICAS DE GTDC / SEP */}
        {systemMode === 'gtdc' ? (
          <>
            {onOpenPuModal && (
              <button
                onClick={onOpenPuModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs shadow-md transition-all shrink-0"
                title="Abrir Análise e Calculadora em Por Unidade (PU)"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                <span>Análise PU</span>
              </button>
            )}

            {onOpenYBusModal && (
              <button
                onClick={onOpenYBusModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold text-xs shadow-md transition-all shrink-0"
                title="Abrir Montagem da Matriz de Admitâncias Ybarra e Impedâncias Zbarra"
              >
                <Network className="w-3.5 h-3.5 text-indigo-400" />
                <span>Matriz Ybarra</span>
              </button>
            )}

            {onOpenLtModal && (
              <button
                onClick={onOpenLtModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 font-bold text-xs shadow-md transition-all shrink-0"
                title="Abrir Análise de Linhas de Transmissão, Constantes ABCD, Efeito Ferranti e Compensação"
              >
                <Activity className="w-3.5 h-3.5 text-pink-400" />
                <span>Análise LT</span>
              </button>
            )}
          </>
        ) : (
          /* FERRAMENTAS ESPECÍFICAS DE CIRCUITOS II */
          <>
            <button
              onClick={onOpenImpedanceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs shadow-md transition-all shrink-0"
              title="Calcular Impedância Equivalente Zab nos terminais a e b"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-400" />
              <span>Impedância Zab</span>
            </button>

            <button
              onClick={onOpenPhotoModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 hover:from-sky-300 hover:to-purple-300 text-slate-950 font-extrabold text-xs shadow-md shadow-indigo-500/25 transition-all shrink-0"
              title="Importar circuito a partir de foto / câmera"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>Foto Circuito</span>
            </button>
          </>
        )}

        {/* Exemplos Prontos (Adaptáveis ao Modo) */}
        <div className="relative group shrink-0">
          <button className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            systemMode === 'gtdc'
              ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 border-amber-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}>
            <Layers className={`w-3.5 h-3.5 ${systemMode === 'gtdc' ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span className="hidden md:inline">
              {systemMode === 'gtdc' ? 'Sistemas GTDC' : 'Exemplos'}
            </span>
          </button>

          <div className="absolute right-0 top-full mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              systemMode === 'gtdc' ? 'text-amber-400' : 'text-slate-500'
            }`}>
              {systemMode === 'gtdc' ? 'Sistemas Prontos de GTDC / SEP' : 'Circuitos Prontos'}
            </div>
            {(systemMode === 'gtdc' ? PRESET_CIRCUITS_GTDC : PRESET_CIRCUITS).map(p => (
              <button
                key={p.id}
                onClick={() => onLoadPreset(p)}
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
        </div>

        {/* Botão do Osciloscópio */}
        <button
          onClick={onToggleScope}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isScopeOpen
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
          title="Exibir Osciloscópio Multicanal"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Scope</span>
        </button>

        {/* Ferramentas */}
        <div className="hidden sm:block h-5 w-[1px] bg-slate-800" />

        <button
          onClick={onExport}
          className="hidden sm:block p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          title="Salvar circuito JSON"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={onImport}
          className="hidden sm:block p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          title="Carregar circuito JSON"
        >
          <Upload className="w-4 h-4" />
        </button>

        <button
          onClick={onNewProject || onClear}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
          title="Novo Projeto / Limpar esquemático"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
