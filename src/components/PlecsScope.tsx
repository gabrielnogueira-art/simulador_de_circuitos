import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ScopeSignal, SimulationMetrics } from '../schematic/types';
import { Maximize2, Minimize2, Eye, EyeOff, X, Sliders, Activity, Download } from 'lucide-react';

interface PlecsScopeProps {
  signals: Map<string, ScopeSignal>;
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
}

export const PlecsScope: React.FC<PlecsScopeProps> = ({ signals, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCursors, setShowCursors] = useState(true);
  const [cursorX1Norm, setCursorX1Norm] = useState(0.25);
  const [cursorX2Norm, setCursorX2Norm] = useState(0.75);
  const [draggedCursor, setDraggedCursor] = useState<'c1' | 'c2' | null>(null);
  const [visibleChannels, setVisibleChannels] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setVisibleChannels(prev => {
      const updated = { ...prev };
      for (const id of signals.keys()) {
        if (updated[id] === undefined) {
          updated[id] = true;
        }
      }
      return updated;
    });
  }, [signals]);

  const toggleChannel = (id: string) => {
    setVisibleChannels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const signalList = useMemo(() => Array.from(signals.values()), [signals]);

  const bounds = useMemo(() => {
    let minT = Infinity;
    let maxT = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;

    for (const sig of signalList) {
      if (!visibleChannels[sig.id] || sig.data.length === 0) continue;
      for (const pt of sig.data) {
        if (pt.time < minT) minT = pt.time;
        if (pt.time > maxT) maxT = pt.time;
        if (pt.value < minV) minV = pt.value;
        if (pt.value > maxV) maxV = pt.value;
      }
    }

    if (minT === Infinity) {
      minT = 0;
      maxT = 0.05;
    }
    if (maxT <= minT) maxT = minT + 0.01;

    if (minV === Infinity) {
      minV = -10;
      maxV = 10;
    }
    if (maxV <= minV) {
      minV -= 1;
      maxV += 1;
    }

    const vSpan = maxV - minV;
    minV -= vSpan * 0.1;
    maxV += vSpan * 0.1;

    return { minT, maxT, minV, maxV };
  }, [signalList, visibleChannels]);

  const metrics = useMemo(() => {
    const res: Record<string, SimulationMetrics> = {};

    for (const sig of signalList) {
      if (sig.data.length === 0) continue;

      let sum = 0;
      let sumSq = 0;
      let max = -Infinity;
      let min = Infinity;

      for (const pt of sig.data) {
        sum += pt.value;
        sumSq += pt.value * pt.value;
        if (pt.value > max) max = pt.value;
        if (pt.value < min) min = pt.value;
      }

      const count = sig.data.length;
      const mean = sum / count;
      const rms = Math.sqrt(sumSq / count);
      const vpp = max - min;

      res[sig.id] = { vpp, rms, mean, max, min };
    }

    return res;
  }, [signalList]);

  const cursorMetrics = useMemo(() => {
    const tSpan = bounds.maxT - bounds.minT;
    const t1 = bounds.minT + cursorX1Norm * tSpan;
    const t2 = bounds.minT + cursorX2Norm * tSpan;
    const dt = Math.abs(t2 - t1);
    const freq = dt > 1e-9 ? 1 / dt : 0;

    const channelVals: Record<string, { y1: number; y2: number; dy: number }> = {};

    for (const sig of signalList) {
      if (sig.data.length === 0) continue;

      const getYAtT = (tTarget: number) => {
        const data = sig.data;
        if (tTarget <= data[0].time) return data[0].value;
        if (tTarget >= data[data.length - 1].time) return data[data.length - 1].value;

        let low = 0;
        let high = data.length - 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (data[mid].time < tTarget) low = mid + 1;
          else high = mid - 1;
        }

        const i1 = Math.max(0, high);
        const i2 = Math.min(data.length - 1, low);
        if (i1 === i2) return data[i1].value;

        const frac = (tTarget - data[i1].time) / (data[i2].time - data[i1].time);
        return data[i1].value + frac * (data[i2].value - data[i1].value);
      };

      const y1 = getYAtT(t1);
      const y2 = getYAtT(t2);
      channelVals[sig.id] = { y1, y2, dy: y2 - y1 };
    }

    return { t1, t2, dt, freq, channelVals };
  }, [bounds, cursorX1Norm, cursorX2Norm, signalList]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const padLeft = 55;
    const padRight = 25;
    const padTop = 22;
    const padBottom = 30;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#0d131f';
    ctx.fillRect(padLeft, padTop, plotW, plotH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#1e293b';
    const xDivs = 10;
    const yDivs = 8;

    for (let i = 1; i < xDivs; i++) {
      const x = padLeft + (i / xDivs) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
    }

    for (let j = 1; j < yDivs; j++) {
      const y = padTop + (j / yDivs) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }

    if (bounds.minV <= 0 && bounds.maxV >= 0) {
      const zeroY = padTop + plotH - ((0 - bounds.minV) / (bounds.maxV - bounds.minV)) * plotH;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, zeroY);
      ctx.lineTo(padLeft + plotW, zeroY);
      ctx.stroke();
    }

    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let j = 0; j <= yDivs; j += 2) {
      const frac = 1 - j / yDivs;
      const val = bounds.minV + frac * (bounds.maxV - bounds.minV);
      const y = padTop + (j / yDivs) * plotH;
      ctx.fillText(val.toFixed(1), padLeft - 6, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= xDivs; i += 2) {
      const frac = i / xDivs;
      const tVal = bounds.minT + frac * (bounds.maxT - bounds.minT);
      const x = padLeft + frac * plotW;
      const tText = tVal >= 1 ? `${tVal.toFixed(2)}s` : `${(tVal * 1e3).toFixed(1)}ms`;
      ctx.fillText(tText, x, padTop + plotH + 6);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    for (const sig of signalList) {
      if (!visibleChannels[sig.id] || sig.data.length < 2) continue;

      ctx.beginPath();
      ctx.strokeStyle = sig.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.shadowColor = sig.color;
      ctx.shadowBlur = 4;

      let first = true;
      for (const pt of sig.data) {
        const xFrac = (pt.time - bounds.minT) / (bounds.maxT - bounds.minT);
        const yFrac = (pt.value - bounds.minV) / (bounds.maxV - bounds.minV);

        const px = padLeft + xFrac * plotW;
        const py = padTop + plotH - yFrac * plotH;

        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    if (showCursors) {
      const c1X = padLeft + cursorX1Norm * plotW;
      const c2X = padLeft + cursorX2Norm * plotW;

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(c1X, padTop);
      ctx.lineTo(c1X, padTop + plotH);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(c1X - 12, padTop - 18, 24, 16);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C1', c1X, padTop - 10);

      ctx.strokeStyle = '#ffeb3b';
      ctx.setLineDash([4, 3]);
      ctx.shadowColor = '#ffeb3b';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(c2X, padTop);
      ctx.lineTo(c2X, padTop + plotH);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(c2X - 12, padTop - 18, 24, 16);
      ctx.fillStyle = '#000000';
      ctx.fillText('C2', c2X, padTop - 10);
    }

    ctx.restore();
  }, [signalList, visibleChannels, bounds, showCursors, cursorX1Norm, cursorX2Norm, isExpanded]);

  const handlePointerDown = (clientX: number) => {
    if (!showCursors || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const padLeft = 55;
    const plotW = rect.width - padLeft - 25;

    const c1X = padLeft + cursorX1Norm * plotW;
    const c2X = padLeft + cursorX2Norm * plotW;

    if (Math.abs(x - c1X) < 22) {
      setDraggedCursor('c1');
    } else if (Math.abs(x - c2X) < 22) {
      setDraggedCursor('c2');
    }
  };

  const handlePointerMove = (clientX: number) => {
    if (!draggedCursor || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const padLeft = 55;
    const plotW = rect.width - padLeft - 25;

    const norm = Math.max(0, Math.min(1, (x - padLeft) / plotW));
    if (draggedCursor === 'c1') {
      setCursorX1Norm(norm);
    } else {
      setCursorX2Norm(norm);
    }
  };

  const exportCsv = () => {
    if (signalList.length === 0) return;
    let csv = 'Time(s),' + signalList.map(s => `${s.name}(${s.unit})`).join(',') + '\n';
    const firstSig = signalList[0];
    for (let i = 0; i < firstSig.data.length; i++) {
      const t = firstSig.data[i].time;
      const row = [t];
      for (const s of signalList) {
        row.push(s.data[i]?.value ?? 0);
      }
      csv += row.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plecs_scope_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-30 transition-all duration-300 flex flex-col bg-slate-950 border border-slate-700 shadow-2xl overflow-hidden ${
        isExpanded
          ? 'inset-2 sm:inset-4 rounded-xl'
          : 'bottom-0 left-0 right-0 sm:bottom-4 sm:right-4 sm:left-auto sm:w-[680px] h-[380px] sm:h-[460px] rounded-t-2xl sm:rounded-xl'
      }`}
    >
      {/* Topo do PLECS Scope */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900 border-b border-slate-800 select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide">
            <Activity className="w-3.5 h-3.5" />
            PLECS SCOPE
          </div>
          <span className="hidden sm:inline text-xs text-slate-400">
            {signalList.length} {signalList.length === 1 ? 'canal' : 'canais'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCursors(!showCursors)}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
              showCursors
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Ativar/Desativar Cursores"
          >
            <Sliders className="w-3 h-3" />
            <span>Cursores</span>
          </button>

          <button
            onClick={exportCsv}
            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
            title="Exportar CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
            title={isExpanded ? 'Restaurar' : 'Expandir'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
            title="Fechar Scope"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canais */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto shrink-0">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">Canais:</span>
        {signalList.length === 0 ? (
          <span className="text-xs text-slate-500 italic">Nenhum medidor conectado</span>
        ) : (
          signalList.map(sig => {
            const isVis = visibleChannels[sig.id] ?? true;
            return (
              <button
                key={sig.id}
                onClick={() => toggleChannel(sig.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium shrink-0 transition-all ${
                  isVis
                    ? 'bg-slate-800 border border-slate-700 text-slate-200'
                    : 'bg-slate-900/40 border border-slate-800/40 text-slate-500 opacity-60'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: sig.color, opacity: isVis ? 1 : 0.3 }}
                />
                <span>{sig.name}</span>
                {isVis ? <Eye className="w-2.5 h-2.5 ml-0.5 text-slate-400" /> : <EyeOff className="w-2.5 h-2.5 ml-0.5" />}
              </button>
            );
          })
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative cursor-crosshair overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={e => handlePointerDown(e.clientX)}
          onMouseMove={e => handlePointerMove(e.clientX)}
          onMouseUp={() => setDraggedCursor(null)}
          onTouchStart={e => e.touches[0] && handlePointerDown(e.touches[0].clientX)}
          onTouchMove={e => e.touches[0] && handlePointerMove(e.touches[0].clientX)}
          onTouchEnd={() => setDraggedCursor(null)}
          className="w-full h-full block"
        />
      </div>

      {/* Medições e Cursores */}
      <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 text-xs font-mono select-none shrink-0">
        {showCursors && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-1 mb-1 border-b border-slate-800/80 text-[10px] sm:text-[11px]">
            <div className="text-cyan-400">
              <span className="text-slate-500">C1: </span>
              {(cursorMetrics.t1 * 1e3).toFixed(2)}ms
            </div>
            <div className="text-amber-400">
              <span className="text-slate-500">C2: </span>
              {(cursorMetrics.t2 * 1e3).toFixed(2)}ms
            </div>
            <div className="text-slate-200">
              <span className="text-slate-500">Δt: </span>
              {(cursorMetrics.dt * 1e3).toFixed(2)}ms
            </div>
            <div className="text-emerald-400">
              <span className="text-slate-500">f: </span>
              {cursorMetrics.freq >= 1e3 ? `${(cursorMetrics.freq / 1e3).toFixed(2)}kHz` : `${cursorMetrics.freq.toFixed(1)}Hz`}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 overflow-x-auto text-[10px] sm:text-[11px]">
          {signalList.filter(s => visibleChannels[s.id]).map(s => {
            const m = metrics[s.id];
            const cv = cursorMetrics.channelVals[s.id];
            if (!m) return null;
            return (
              <div key={s.id} className="flex items-center gap-2 pr-3 border-r border-slate-800/80 last:border-0 shrink-0">
                <span className="font-semibold" style={{ color: s.color }}>
                  {s.name}:
                </span>
                <span className="text-slate-400">
                  Vpp: <strong className="text-slate-200">{m.vpp?.toFixed(2)}{s.unit}</strong>
                </span>
                <span className="text-slate-400">
                  RMS: <strong className="text-slate-200">{m.rms?.toFixed(2)}{s.unit}</strong>
                </span>
                {showCursors && cv && (
                  <span className="text-cyan-300">
                    ΔY: <strong>{cv.dy.toFixed(2)}{s.unit}</strong>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
