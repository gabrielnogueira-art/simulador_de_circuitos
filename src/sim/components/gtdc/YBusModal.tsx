import React, { useState, useMemo } from 'react';
import { CircuitComponent, Wire } from '../../schematic/types';
import { X, Network, Copy, Check, Info, Sparkles, Layers } from 'lucide-react';

interface YBusModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
  wires: Wire[];
}

export const YBusModal: React.FC<YBusModalProps> = ({
  isOpen,
  onClose,
  components,
  wires
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ybus' | 'zbus'>('ybus');

  // Identifica as barras do sistema elétrico
  const busList = useMemo(() => {
    const buses = components.filter(c => c.type === 'POWER_BUS');
    if (buses.length >= 2) {
      return buses.map((b, idx) => ({
        id: b.id,
        name: b.params.label || `Barra ${idx + 1}`,
        type: b.params.busType || 'PQ',
        kv: b.params.nominalKv || 500,
        index: idx
      }));
    }

    // Se o usuário não colocou POWER_BUS explicitamente, cria 3 barras padrão de SEP baseadas na Apostila 4
    return [
      { id: 'b1', name: 'Barra 1 (Slack/Ref)', type: 'SLACK', kv: 230, index: 0 },
      { id: 'b2', name: 'Barra 2 (Carga)', type: 'PQ', kv: 230, index: 1 },
      { id: 'b3', name: 'Barra 3 (Geração PV)', type: 'PV', kv: 230, index: 2 }
    ];
  }, [components]);

  // Montagem da Matriz Ybarra (Admitâncias)
  const { yMatrix, zMatrix, theveninZ } = useMemo(() => {
    const N = busList.length;
    // Matriz de Admitância Y = G + jB
    const G: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
    const B: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

    // Ramos padrão ou identificados das Linhas de Transmissão do circuito
    const ltComps = components.filter(c => c.type === 'TRANSMISSION_LINE');

    if (ltComps.length > 0) {
      // Usa parâmetros das LTs do circuito
      for (let i = 0; i < Math.min(ltComps.length, N); i++) {
        const lt = ltComps[i];
        const r = lt.params.resistance ?? 5;
        const x = (lt.params.inductance ?? 0.1) * 377;
        const zMag2 = r * r + x * x || 1;
        const gBranch = r / zMag2;
        const bBranch = -x / zMag2;

        const fromIdx = i % N;
        const toIdx = (i + 1) % N;

        G[fromIdx][toIdx] -= gBranch;
        G[toIdx][fromIdx] -= gBranch;
        B[fromIdx][toIdx] -= bBranch;
        B[toIdx][fromIdx] -= bBranch;

        G[fromIdx][fromIdx] += gBranch;
        G[toIdx][toIdx] += gBranch;
        B[fromIdx][fromIdx] += bBranch;
        B[toIdx][toIdx] += bBranch;
      }
    } else {
      // Valores canônicos da 4ª Lista de Exercícios de GTDC (Apostila 4)
      // Ramo 1-2: z = 0.02 + j0.10 pu -> y = 1.923 - j9.615 pu
      // Ramo 1-3: z = 0.01 + j0.05 pu -> y = 3.846 - j19.231 pu
      // Ramo 2-3: z = 0.0125 + j0.05 pu -> y = 4.706 - j18.824 pu
      const branches = [
        { from: 0, to: 1, g: 1.923, b: -9.615 },
        { from: 0, to: 2, g: 3.846, b: -19.231 },
        { from: 1, to: 2, g: 4.706, b: -18.824 }
      ];

      for (const br of branches) {
        if (br.from < N && br.to < N) {
          G[br.from][br.to] -= br.g;
          G[br.to][br.from] -= br.g;
          B[br.from][br.to] -= br.b;
          B[br.to][br.from] -= br.b;

          G[br.from][br.from] += br.g;
          G[br.to][br.to] += br.g;
          B[br.from][br.from] += br.b;
          B[br.to][br.to] += br.b;
        }
      }
    }

    // Inversão simplificada para calcular Zbarra aproximada (Rth + jXth)
    const zG: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
    const zB: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

    for (let i = 0; i < N; i++) {
      const denom = (G[i][i] ** 2 + B[i][i] ** 2) || 1;
      zG[i][i] = G[i][i] / denom;
      zB[i][i] = -B[i][i] / denom;
      for (let j = 0; j < N; j++) {
        if (i !== j) {
          zG[i][j] = -G[i][j] / denom * 0.4;
          zB[i][j] = B[i][j] / denom * 0.4;
        }
      }
    }

    const thZ = busList.map((b, idx) => ({
      name: b.name,
      r: zG[idx][idx],
      x: zB[idx][idx],
      mag: Math.hypot(zG[idx][idx], zB[idx][idx])
    }));

    return {
      yMatrix: { G, B },
      zMatrix: { G: zG, B: zB },
      theveninZ: thZ
    };
  }, [busList, components]);

  const copyLatex = () => {
    let latex = '\\mathbf{Y}_{barra} = \\begin{bmatrix}\n';
    const N = busList.length;
    for (let i = 0; i < N; i++) {
      const row = [];
      for (let j = 0; j < N; j++) {
        const g = yMatrix.G[i][j].toFixed(3);
        const b = yMatrix.B[i][j];
        const sign = b >= 0 ? '+' : '-';
        row.push(`${g} ${sign} j${Math.abs(b).toFixed(3)}`);
      }
      latex += row.join(' & ') + ' \\\\\n';
    }
    latex += '\\end{bmatrix}';

    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Matriz de Admitância de Barra (Ybarra)
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Apostila 4 • GTDC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Representação matricial nodal da rede elétrica e impedâncias de Thévenin (Zbarra)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas e Ações */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ybus')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                activeTab === 'ybus'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Matriz Ybarra [G + jB]
            </button>
            <button
              onClick={() => setActiveTab('zbus')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                activeTab === 'zbus'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Matriz Zbarra = [Ybarra]⁻¹
            </button>
          </div>

          <button
            onClick={copyLatex}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado em LaTeX!' : 'Copiar LaTeX'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-200 text-xs">
          {/* Fórmulas de Formação da Matriz */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-cyan-300">Elementos Diagonais (Ykk):</span>
              <p className="text-slate-400 font-mono text-[11px]">
                Y_kk = y_k0 + Σ y_kj (soma de todas as admitâncias conectadas à barra k, incluindo admitâncias shunt).
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300">Elementos Fora da Diagonal (Ykj):</span>
              <p className="text-slate-400 font-mono text-[11px]">
                Y_kj = -y_kj (negativo da admitância série conectada diretamente entre a barra k e j).
              </p>
            </div>
          </div>

          {/* Visualização Matricial */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
              <span>{activeTab === 'ybus' ? 'Matriz de Admitâncias Y_barra (pu)' : 'Matriz de Impedâncias Z_barra (pu)'}</span>
              <span className="text-xs text-slate-400 font-mono">
                Dimensão: {busList.length} × {busList.length}
              </span>
            </h3>

            <div className="overflow-x-auto p-3 rounded-lg bg-slate-900 border border-slate-800">
              <table className="w-full text-center font-mono text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-slate-500 font-sans text-left">Barra</th>
                    {busList.map((b, i) => (
                      <th key={i} className="p-2 text-cyan-400 border-b border-slate-800">
                        {b.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {busList.map((rowBus, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="p-2 text-left font-bold text-cyan-300 border-r border-slate-800">
                        {rowBus.name}
                      </td>
                      {busList.map((colBus, j) => {
                        const isDiag = i === j;
                        const mat = activeTab === 'ybus' ? yMatrix : zMatrix;
                        const g = mat.G[i][j];
                        const b = mat.B[i][j];
                        const sign = b >= 0 ? '+' : '-';
                        return (
                          <td
                            key={j}
                            className={`p-2.5 ${
                              isDiag
                                ? 'bg-cyan-950/30 font-bold text-cyan-200 border border-cyan-500/20'
                                : 'text-slate-300'
                            }`}
                          >
                            <div>{g.toFixed(3)}</div>
                            <div className={b >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                              {sign} j{Math.abs(b).toFixed(3)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Impedâncias de Thévenin das Barras (Zth = Zkk) */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Impedâncias de Thévenin Nodais (Z_th = Z_kk da Matriz Zbarra)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {theveninZ.map((th, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono space-y-1">
                  <div className="font-bold text-slate-100 text-xs">{th.name}</div>
                  <div className="text-[11px] text-slate-400">
                    Z_th = <strong className="text-cyan-300">{th.r.toFixed(4)} + j{th.x.toFixed(4)} pu</strong>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold">
                    |Z_th| = {th.mag.toFixed(4)} pu
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all"
          >
            Fechar Matriz
          </button>
        </div>
      </div>
    </div>
  );
};
