import React from 'react';
import { ComponentType } from '../schematic/types';
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
  X
} from 'lucide-react';

interface ComponentPaletteProps {
  onAddComponent: (type: ComponentType) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface PaletteItem {
  type: ComponentType;
  name: string;
  symbol: string;
  icon: React.ReactNode;
  category: 'passives' | 'sources' | 'semiconductors' | 'instruments';
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Passivos
  { type: 'RESISTOR', name: 'Resistor', symbol: 'R', icon: <Boxes className="w-4 h-4 text-emerald-400" />, category: 'passives' },
  { type: 'CAPACITOR', name: 'Capacitor', symbol: 'C', icon: <Boxes className="w-4 h-4 text-cyan-400" />, category: 'passives' },
  { type: 'INDUCTOR', name: 'Indutor', symbol: 'L', icon: <Boxes className="w-4 h-4 text-purple-400" />, category: 'passives' },
  { type: 'SWITCH', name: 'Chave / Switch', symbol: 'SW', icon: <ToggleLeft className="w-4 h-4 text-amber-400" />, category: 'passives' },

  // Fontes
  { type: 'DC_VOLTAGE', name: 'Fonte DC', symbol: 'Vdc', icon: <CircleDot className="w-4 h-4 text-sky-400" />, category: 'sources' },
  { type: 'AC_VOLTAGE', name: 'Fonte AC', symbol: 'Vac', icon: <Waves className="w-4 h-4 text-indigo-400" />, category: 'sources' },
  { type: 'PULSE_VOLTAGE', name: 'Gerador PWM', symbol: 'PWM', icon: <Activity className="w-4 h-4 text-pink-400" />, category: 'sources' },
  { type: 'GROUND', name: 'Terra (GND)', symbol: '0V', icon: <Minus className="w-4 h-4 text-slate-400" />, category: 'sources' },

  // Semicondutores
  { type: 'DIODE', name: 'Diodo', symbol: 'D', icon: <ArrowRightLeft className="w-4 h-4 text-rose-400" />, category: 'semiconductors' },

  // Instrumentos
  { type: 'VOLTMETER', name: 'Voltímetro', symbol: 'V', icon: <Gauge className="w-4 h-4 text-cyan-400" />, category: 'instruments' },
  { type: 'AMMETER', name: 'Amperímetro', symbol: 'A', icon: <Gauge className="w-4 h-4 text-amber-400" />, category: 'instruments' },
];

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  onAddComponent,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const categories = [
    { id: 'passives', title: 'Passivos & Chaves' },
    { id: 'sources', title: 'Fontes & Referências' },
    { id: 'semiconductors', title: 'Semicondutores' },
    { id: 'instruments', title: 'Sondas & Medidores' }
  ];

  const handleSelect = (type: ComponentType) => {
    onAddComponent(type);
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
                    <button
                      key={item.type}
                      onClick={() => handleSelect(item.type)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 hover:border-cyan-500/50 hover:shadow-md active:scale-95 transition-all group text-left touch-manipulation"
                      title={`Adicionar ${item.name} ao circuito`}
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
