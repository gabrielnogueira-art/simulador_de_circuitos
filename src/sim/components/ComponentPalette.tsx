import React, { useMemo } from 'react';
import { ComponentType, ComponentParams, SystemMode } from '../schematic/types';
import { 
  Zap, 
  CircleDot, 
  Waves, 
  Activity, 
  ToggleLeft, 
  Gauge, 
  ArrowRightLeft,
  Boxes,
  Minus,
  X,
  Sliders,
  Settings2,
  Plus,
  Camera,
  FilePlus,
  Sparkles,
  Network,
  Factory
} from 'lucide-react';

interface ComponentPaletteProps {
  systemMode?: SystemMode;
  onAddComponent: (type: ComponentType, initialParams?: Partial<ComponentParams>) => void;
  onRequestPreconfigure: (type: ComponentType, initialParams?: Partial<ComponentParams>) => void;
  alwaysPreconfigure: boolean;
  onToggleAlwaysPreconfigure: (val: boolean) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenPhotoModal?: () => void;
  onNewProject?: () => void;
}

interface PaletteItem {
  type: ComponentType;
  name: string;
  symbol: string;
  icon: React.ReactNode;
  category: 'passives' | 'sources' | 'semiconductors' | 'instruments' | 'gtdc';
  defaultParams?: Partial<ComponentParams>;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Sistemas Elétricos de Potência (GTDC / SEP)
  { type: 'POWER_BUS', name: 'Barra / Barramento', symbol: 'BUS', icon: <Network className="w-4 h-4 text-amber-400" />, category: 'gtdc' },
  { type: 'TRANSMISSION_LINE', name: 'Linha de Transmissão (LT)', symbol: 'LT', icon: <Activity className="w-4 h-4 text-sky-400" />, category: 'gtdc' },
  { type: 'POWER_TRANSFORMER', name: 'Trafo de Potência (Y-Δ)', symbol: 'Trafo', icon: <Boxes className="w-4 h-4 text-purple-400" />, category: 'gtdc' },
  { type: 'SYNCHRONOUS_GENERATOR', name: 'Gerador Síncrono / Usina', symbol: 'G', icon: <Zap className="w-4 h-4 text-emerald-400" />, category: 'gtdc' },
  { type: 'POWER_LOAD', name: 'Carga Trifásica (P+jQ)', symbol: 'P+jQ', icon: <Sliders className="w-4 h-4 text-orange-400" />, category: 'gtdc' },
  { type: 'SHUNT_REACTOR', name: 'Reator Shunt (Ferranti)', symbol: 'Lsh', icon: <Waves className="w-4 h-4 text-pink-400" />, category: 'gtdc' },
  { type: 'SERIES_CAPACITOR', name: 'Capacitor Série (FC%)', symbol: 'Csér', icon: <Boxes className="w-4 h-4 text-cyan-400" />, category: 'gtdc' },

  // Passivos
  { type: 'RESISTOR', name: 'Resistor', symbol: 'R', icon: <Boxes className="w-4 h-4 text-emerald-400" />, category: 'passives' },
  { type: 'CAPACITOR', name: 'Capacitor', symbol: 'C', icon: <Boxes className="w-4 h-4 text-cyan-400" />, category: 'passives' },
  { type: 'INDUCTOR', name: 'Indutor', symbol: 'L', icon: <Boxes className="w-4 h-4 text-purple-400" />, category: 'passives' },
  { type: 'SWITCH', name: 'Chave / Switch', symbol: 'SW', icon: <ToggleLeft className="w-4 h-4 text-amber-400" />, category: 'passives' },
  { type: 'SPDT_SWITCH', name: 'Chave Comutadora (a/b)', symbol: 'S a/b', icon: <ArrowRightLeft className="w-4 h-4 text-amber-300" />, category: 'passives' },
  { type: 'JUNCTION_DOT', name: 'Nó / Emenda de Fios', symbol: '•', icon: <CircleDot className="w-4 h-4 text-cyan-400" />, category: 'passives' },

  // Fontes & Referências
  { type: 'DC_VOLTAGE', name: 'Fonte de Tensão DC', symbol: 'Vdc', icon: <CircleDot className="w-4 h-4 text-sky-400" />, category: 'sources' },
  { type: 'AC_VOLTAGE', name: 'Fonte de Tensão AC / Fasorial', symbol: 'Vac', icon: <Waves className="w-4 h-4 text-indigo-400" />, category: 'sources' },
  { type: 'AC_CURRENT', name: 'Fonte de Corrente AC / Fasorial', symbol: 'Iac', icon: <Waves className="w-4 h-4 text-amber-400" />, category: 'sources' },
  { type: 'PULSE_VOLTAGE', name: 'Gerador PWM', symbol: 'PWM', icon: <Activity className="w-4 h-4 text-pink-400" />, category: 'sources' },
  { type: 'DEPENDENT_SOURCE', name: 'Fonte Dependente', symbol: 'k·x', icon: <Sliders className="w-4 h-4 text-fuchsia-400" />, category: 'sources' },
  { type: 'GROUND', name: 'Terra (GND)', symbol: '0V', icon: <Minus className="w-4 h-4 text-slate-400" />, category: 'sources' },

  // Semicondutores
  { type: 'DIODE', name: 'Diodo', symbol: 'D', icon: <ArrowRightLeft className="w-4 h-4 text-rose-400" />, category: 'semiconductors' },

  // Instrumentos & Medição de Impedância Zab
  { 
    type: 'PORT_TERMINAL', 
    name: 'Terminal "a"', 
    symbol: 'a', 
    icon: <CircleDot className="w-4 h-4 text-cyan-400" />, 
    category: 'instruments',
    defaultParams: { portName: 'a', label: 'a' }
  },
  { 
    type: 'PORT_TERMINAL', 
    name: 'Terminal "b"', 
    symbol: 'b', 
    icon: <CircleDot className="w-4 h-4 text-amber-400" />, 
    category: 'instruments',
    defaultParams: { portName: 'b', label: 'b' }
  },
  { type: 'VOLTMETER', name: 'Voltímetro', symbol: 'V', icon: <Gauge className="w-4 h-4 text-cyan-400" />, category: 'instruments' },
  { type: 'AMMETER', name: 'Amperímetro', symbol: 'A', icon: <Gauge className="w-4 h-4 text-amber-400" />, category: 'instruments' },
];

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  systemMode = 'circuitos_ii',
  onAddComponent,
  onRequestPreconfigure,
  alwaysPreconfigure,
  onToggleAlwaysPreconfigure,
  isOpenMobile = false,
  onCloseMobile,
  onOpenPhotoModal,
  onNewProject
}) => {
  const categories = useMemo(() => {
    const gtdcCat = { id: 'gtdc', title: 'Sistemas de Potência (GTDC)', badge: 'SEP' };
    const stdCats = [
      { id: 'passives', title: 'Passivos & Chaves' },
      { id: 'sources', title: 'Fontes & Referências' },
      { id: 'semiconductors', title: 'Semicondutores' },
      { id: 'instruments', title: 'Sondas & Terminais Zab' }
    ];
    if (systemMode === 'gtdc') {
      return [gtdcCat, ...stdCats];
    }
    return [...stdCats, gtdcCat];
  }, [systemMode]);

  const handleSelect = (item: PaletteItem) => {
    if (alwaysPreconfigure) {
      onRequestPreconfigure(item.type, item.defaultParams);
    } else {
      onAddComponent(item.type, item.defaultParams);
    }
    if (onCloseMobile) onCloseMobile();
  };

  const handleConfigureDirect = (e: React.MouseEvent, item: PaletteItem) => {
    e.stopPropagation();
    onRequestPreconfigure(item.type, item.defaultParams);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Backdrop para mobile */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm sm:hidden animate-in fade-in duration-150"
        />
      )}

      <aside
        className={`fixed sm:static inset-y-0 left-0 z-40 w-72 sm:w-64 bg-slate-900 border-r border-slate-800 flex flex-col select-none overflow-y-auto transition-transform duration-200 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Biblioteca de Blocos
            </h2>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="sm:hidden p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Ações de Destaque: Importar Foto & Novo Projeto */}
        {(onOpenPhotoModal || onNewProject) && (
          <div className="p-3 bg-slate-950/90 border-b border-slate-800/80 space-y-2">
            {onOpenPhotoModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenPhotoModal();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-purple-500/20 hover:from-sky-500/30 hover:to-purple-500/30 border border-sky-500/40 hover:border-sky-400 text-slate-100 transition-all group shadow-md cursor-pointer"
                title="Tirar foto ou enviar imagem de circuito"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-sky-500/30 text-sky-300 border border-sky-500/40 group-hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      Importar por Foto
                      <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300/30" />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Reconhece e monta na tela
                    </div>
                  </div>
                </div>
              </button>
            )}

            {onNewProject && (
              <button
                type="button"
                onClick={() => {
                  onNewProject();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-slate-700 text-xs font-medium transition-all cursor-pointer"
                title="Limpar esquemático para novo projeto"
              >
                <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Novo Projeto em Branco</span>
              </button>
            )}
          </div>
        )}

        {/* Barra de Controle: Configurar antes de Inserir */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 space-y-2">
          <button
            type="button"
            onClick={() => onRequestPreconfigure('RESISTOR')}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600/30 via-sky-600/30 to-indigo-600/30 hover:from-cyan-600/50 hover:to-indigo-600/50 border border-cyan-500/40 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Configurar Componente...</span>
          </button>

          <label className="flex items-center justify-between px-1 text-[11px] text-slate-300 cursor-pointer select-none">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span>Configurar antes de inserir</span>
            </span>
            <input
              type="checkbox"
              checked={alwaysPreconfigure}
              onChange={e => onToggleAlwaysPreconfigure(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
            />
          </label>
        </div>

        <div className="p-3 space-y-4 flex-1">
          {categories.map(cat => {
            const items = PALETTE_ITEMS.filter(item => item.category === cat.id);
            return (
              <div key={cat.id} className="space-y-1.5">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                  {cat.title}
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map(item => (
                    <div
                      key={`${item.type}_${item.symbol}`}
                      className="relative group"
                    >
                      <button
                        onClick={() => handleSelect(item)}
                        className="w-full flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 hover:border-cyan-500/50 hover:shadow-md active:scale-95 transition-all text-left touch-manipulation cursor-pointer"
                        title={alwaysPreconfigure ? `Configurar e adicionar ${item.name}` : `Adicionar ${item.name} diretamente`}
                      >
                        <div className="p-1.5 rounded-md bg-slate-900/80 mb-1.5 group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                        <span className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 text-center leading-tight">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                          [{item.symbol}]
                        </span>
                      </button>

                      {/* Botão de engrenagem para configurar diretamente */}
                      <button
                        type="button"
                        onClick={e => handleConfigureDirect(e, item)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-slate-900/80 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 border border-slate-700/60 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={`Configurar ${item.name} antes de inserir`}
                      >
                        <Settings2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dicas */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 mb-1">Dicas & Atalhos:</div>
          <div className="flex justify-between">
            <span>Girar bloco:</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-cyan-400 font-mono">R</kbd>
          </div>
          <div className="flex justify-between">
            <span>Excluir:</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-rose-400 font-mono">Del</kbd>
          </div>
          <div className="flex justify-between">
            <span>No celular:</span>
            <span className="text-slate-300">Toque no pino</span>
          </div>
        </div>
      </aside>
    </>
  );
};
