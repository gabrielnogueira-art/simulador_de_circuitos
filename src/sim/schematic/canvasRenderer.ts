import { CircuitComponent, Point, Wire } from './types';
import { getTerminalAbsPosition } from './componentDefs';
import { StepResult } from '../engine/mnaSolver';
import { WireRouting, WireSegment } from './wireRouting';
import { branchTerminalPair } from '../ai/circuitDirections';

export interface ViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private particleOffset: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public updateParticles(deltaTime: number = 0.016) {
    this.particleOffset = (this.particleOffset + deltaTime * 60) % 1000;
  }

  /**
   * Renderiza a grade de fundo do estilo CAD PLECS
   */
  public drawGrid(width: number, height: number, vp: ViewportTransform) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#0b0f19'; // Fundo profissional PLECS escuro
    ctx.fillRect(0, 0, width, height);

    const gridSize = 20 * vp.zoom;
    const startX = ((vp.panX % gridSize) + gridSize) % gridSize;
    const startY = ((vp.panY % gridSize) + gridSize) % gridSize;

    ctx.fillStyle = '#1e293b';
    for (let x = startX; x < width; x += gridSize) {
      for (let y = startY; y < height; y += gridSize) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    ctx.restore();
  }

  /**
   * Converte ponto do esquemático para coordenadas da tela
   */
  public toScreen(pt: Point, vp: ViewportTransform): Point {
    return {
      x: pt.x * vp.zoom + vp.panX,
      y: pt.y * vp.zoom + vp.panY
    };
  }

  /**
   * Converte ponto da tela para coordenadas do esquemático
   */
  public toWorld(pt: Point, vp: ViewportTransform): Point {
    return {
      x: (pt.x - vp.panX) / vp.zoom,
      y: (pt.y - vp.panY) / vp.zoom
    };
  }

  /**
   * Obtém os segmentos de linha de um fio em coordenadas de mundo
   */
  public static getWireSegments(
    wire: Wire,
    compMap: Map<string, CircuitComponent>
  ): { p1: Point; p2: Point }[] {
    const c1 = compMap.get(wire.fromCompId);
    const c2 = compMap.get(wire.toCompId);
    if (!c1 || !c2) return [];

    const start = getTerminalAbsPosition(c1, wire.fromTerminalId);
    const end = getTerminalAbsPosition(c2, wire.toTerminalId);

    // Se houver waypoints definidos pelo usuário
    if (wire.waypoints && wire.waypoints.length > 0) {
      const pts = [start, ...wire.waypoints, end];
      const segs: { p1: Point; p2: Point }[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        segs.push({ p1: pts[i], p2: pts[i + 1] });
      }
      return segs;
    }

    // Traçado ortogonal padrão em L
    const mid = { x: end.x, y: start.y };
    return [
      { p1: start, p2: mid },
      { p1: mid, p2: end }
    ];
  }

  /**
   * Calcula a distância euclidiana de um ponto a um segmento de linha
   */
  public static distToSegment(p: Point, v: Point, w: Point): number {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  /**
   * Verifica se o cursor clicou sobre o fio
   */
  public static isPointNearWire(
    worldPt: Point,
    wire: Wire,
    compMap: Map<string, CircuitComponent>,
    tolerance: number = 8
  ): boolean {
    const segments = CanvasRenderer.getWireSegments(wire, compMap);
    for (const seg of segments) {
      if (CanvasRenderer.distToSegment(worldPt, seg.p1, seg.p2) <= tolerance) {
        return true;
      }
    }
    return false;
  }

  /**
   * Renderiza todos os fios elétricos, partículas de corrente e controles de edição de trechos
   */
  public drawWires(
    wires: Wire[],
    components: CircuitComponent[],
    vp: ViewportTransform,
    selectedWireId: string | null,
    latestResult: StepResult | null,
    hoveredSegment: { wireId: string; segmentIndex: number } | null = null
  ) {
    const ctx = this.ctx;
    const compMap = new Map(components.map(c => [c.id, c]));
    const nodePointCounts = new Map<string, number>();

    for (const wire of wires) {
      const c1 = compMap.get(wire.fromCompId);
      const c2 = compMap.get(wire.toCompId);
      if (!c1 || !c2) continue;

      const segments = WireRouting.getSegments(wire, compMap);
      if (segments.length === 0) continue;

      const pStart = segments[0].p1;
      const pEnd = segments[segments.length - 1].p2;
      const k1 = `${Math.round(pStart.x)},${Math.round(pStart.y)}`;
      const k2 = `${Math.round(pEnd.x)},${Math.round(pEnd.y)}`;
      nodePointCounts.set(k1, (nodePointCounts.get(k1) || 0) + 1);
      nodePointCounts.set(k2, (nodePointCounts.get(k2) || 0) + 1);

      const isSel = wire.id === selectedWireId;

      ctx.save();
      ctx.lineWidth = isSel ? 3.5 : 2.2;
      ctx.strokeStyle = isSel ? '#00e5ff' : '#94a3b8';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (isSel) {
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
      }

      ctx.beginPath();
      const s0 = this.toScreen(segments[0].p1, vp);
      ctx.moveTo(s0.x, s0.y);
      for (const seg of segments) {
        const sNext = this.toScreen(seg.p2, vp);
        ctx.lineTo(sNext.x, sNext.y);
      }
      ctx.stroke();

      // Se o fio estiver selecionado, desenha alças direcionais para cada trecho (horizontal ou vertical)
      if (isSel) {
        ctx.shadowBlur = 0;
        for (let idx = 0; idx < segments.length; idx++) {
          const seg = segments[idx];
          const isH = seg.isHorizontal;
          const isHover = hoveredSegment?.wireId === wire.id && hoveredSegment?.segmentIndex === idx;

          // Ponto médio do trecho
          const midWorld = {
            x: (seg.p1.x + seg.p2.x) / 2,
            y: (seg.p1.y + seg.p2.y) / 2
          };
          const sMid = this.toScreen(midWorld, vp);

          // Pílula indicadora com ícone de direção (↕ ou ↔)
          ctx.save();
          ctx.fillStyle = isHover ? '#38bdf8' : '#0f172a';
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 1.5;

          if (isH) {
            // Trecho horizontal: move para cima/baixo (↕)
            ctx.fillRect(sMid.x - 12, sMid.y - 8, 24, 16);
            ctx.strokeRect(sMid.x - 12, sMid.y - 8, 24, 16);
            ctx.fillStyle = isHover ? '#0f172a' : '#00e5ff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↕', sMid.x, sMid.y);
          } else {
            // Trecho vertical: move para esquerda/direita (↔)
            ctx.fillRect(sMid.x - 8, sMid.y - 12, 16, 24);
            ctx.strokeRect(sMid.x - 8, sMid.y - 12, 16, 24);
            ctx.fillStyle = isHover ? '#0f172a' : '#00e5ff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↔', sMid.x, sMid.y);
          }
          ctx.restore();
        }
      }

      // Renderização da Seta de Sentido da Corrente do Enunciado (ex: ix, io)
      if (wire.currentArrow && segments.length > 0) {
        const midSeg = segments[Math.floor(segments.length / 2)];
        const isReverse = wire.currentArrow.direction === 'reverse';
        const pStart = isReverse ? midSeg.p2 : midSeg.p1;
        const pEnd = isReverse ? midSeg.p1 : midSeg.p2;

        const midWorld = {
          x: (pStart.x + pEnd.x) / 2,
          y: (pStart.y + pEnd.y) / 2
        };
        const sMid = this.toScreen(midWorld, vp);
        const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);

        ctx.save();
        ctx.translate(sMid.x, sMid.y);
        ctx.rotate(angle);

        // 1. Seta destacada (vermelho/carmesim eletrotécnico)
        ctx.fillStyle = '#f43f5e';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;

        // Desenha traço e cabeça da seta
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(8, -5);
        ctx.lineTo(16, 0);
        ctx.lineTo(8, 5);
        ctx.closePath();
        ctx.fill();

        // 2. Rótulo da Corrente (ex: ix, io) com badge horizontal
        const labelText = wire.currentArrow.label || 'i';
        ctx.rotate(-angle); // Mantém o texto sempre na horizontal

        ctx.font = 'bold 11px monospace';
        const textMetrics = ctx.measureText(labelText);
        const textW = textMetrics.width;
        const badgeW = Math.max(textW + 10, 22);
        const badgeH = 16;
        const offsetDist = 16;

        const badgeX = -badgeW / 2;
        const badgeY = -offsetDist - badgeH / 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fecdd3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, 0, badgeY + badgeH / 2);

        ctx.restore();
      }

      // Animação de partículas de corrente fluindo pelo condutor
      if (latestResult) {
        const i1 = latestResult.compCurrents.get(wire.fromCompId) ?? 0;
        const i2 = latestResult.compCurrents.get(wire.toCompId) ?? 0;
        const current = Math.abs(i1) > 1e-6 ? i1 : i2;

        if (Math.abs(current) > 1e-4) {
          let totalLen = 0;
          for (const seg of segments) {
            totalLen += Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y);
          }

          const numParticles = Math.max(2, Math.floor(totalLen / 35));
          const speed = Math.sign(current) * Math.min(Math.max(Math.abs(current) * 2, 0.4), 8);

          ctx.fillStyle = current > 0 ? '#ffea00' : '#00e5ff';
          ctx.shadowColor = current > 0 ? '#ffea00' : '#00e5ff';
          ctx.shadowBlur = 6;

          for (let p = 0; p < numParticles; p++) {
            let prog = ((p / numParticles) + (this.particleOffset * speed * 0.005)) % 1;
            if (prog < 0) prog += 1;

            const targetDist = prog * totalLen;
            let accum = 0;
            let px = segments[0].p1.x;
            let py = segments[0].p1.y;

            for (const seg of segments) {
              const segLen = Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y);
              if (accum + segLen >= targetDist) {
                const frac = segLen > 0 ? (targetDist - accum) / segLen : 0;
                px = seg.p1.x + frac * (seg.p2.x - seg.p1.x);
                py = seg.p1.y + frac * (seg.p2.y - seg.p1.y);
                break;
              }
              accum += segLen;
            }

            const sPt = this.toScreen({ x: px, y: py }, vp);
            ctx.beginPath();
            ctx.arc(sPt.x, sPt.y, 2.5 * vp.zoom, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();
    }

    // Desenha pontos de nó elétrico onde 3 ou mais conexões se encontram
    for (const [key, count] of nodePointCounts.entries()) {
      if (count >= 3) {
        const [x, y] = key.split(',').map(Number);
        const s = this.toScreen({ x, y }, vp);
        ctx.save();
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4.5 * vp.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /**
   * Desenha o retângulo de seleção estilo CAD (Marquee Selection)
   */
  public drawSelectionBox(box: { start: Point; current: Point }, vp: ViewportTransform) {
    const ctx = this.ctx;
    const p1 = this.toScreen(box.start, vp);
    const p2 = this.toScreen(box.current, vp);
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);

    if (w < 1 && h < 1) return;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.14)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  /**
   * Renderiza todos os componentes do esquemático com suporte a seleção múltipla
   */
  public drawComponents(
    components: CircuitComponent[],
    vp: ViewportTransform,
    selectedCompId: string | null,
    hoverTerminalKey: string | null,
    latestResult: StepResult | null,
    selectedCompIds?: string[] | null
  ) {
    const selectedSet = selectedCompIds && selectedCompIds.length > 0 ? new Set(selectedCompIds) : null;
    for (const comp of components) {
      const isSelected = selectedSet ? selectedSet.has(comp.id) : comp.id === selectedCompId;
      this.drawComponent(comp, vp, isSelected, hoverTerminalKey, latestResult);
    }
  }

  /**
   * Renderiza um componente individual com geometria vetorial precisa
   */
  private drawComponent(
    comp: CircuitComponent,
    vp: ViewportTransform,
    isSelected: boolean,
    hoverTerminalKey: string | null,
    latestResult: StepResult | null
  ) {
    const ctx = this.ctx;
    const center = this.toScreen({ x: comp.x, y: comp.y }, vp);

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate((comp.rotation * Math.PI) / 180);
    ctx.scale(vp.zoom, vp.zoom);

    // Bounding box de seleção
    if (isSelected) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-45, -40, 90, 80);
      ctx.setLineDash([]);
    }

    ctx.lineWidth = 2.2;
    ctx.strokeStyle = isSelected ? '#00e5ff' : '#f8fafc';
    ctx.fillStyle = isSelected ? '#00e5ff' : '#f8fafc';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (comp.type) {
      case 'RESISTOR': {
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(-24, 0);
        const steps = [-16, -10, 0, 10, 16, 24];
        const ys = [-12, 12, -12, 12, -12, 0];
        ctx.lineTo(steps[0], ys[0]);
        ctx.lineTo(steps[1], ys[1]);
        ctx.lineTo(steps[2], ys[2]);
        ctx.lineTo(steps[3], ys[3]);
        ctx.lineTo(steps[4], ys[4]);
        ctx.lineTo(steps[5], ys[5]);
        ctx.lineTo(40, 0);
        ctx.stroke();
        break;
      }

      case 'CAPACITOR': {
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-6, 0);
        ctx.moveTo(6, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();

        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-6, -18);
        ctx.lineTo(-6, 18);
        ctx.moveTo(6, -18);
        ctx.lineTo(6, 18);
        ctx.stroke();
        break;
      }

      case 'INDUCTOR': {
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(-24, 0);
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
          const startX = -24 + i * 16;
          ctx.beginPath();
          ctx.arc(startX + 8, 0, 8, Math.PI, 0, false);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.lineTo(40, 0);
        ctx.stroke();
        break;
      }

      case 'GROUND': {
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(0, 0);
        ctx.moveTo(-16, 0);
        ctx.lineTo(16, 0);
        ctx.moveTo(-10, 6);
        ctx.lineTo(10, 6);
        ctx.moveTo(-4, 12);
        ctx.lineTo(4, 12);
        ctx.stroke();
        break;
      }

      case 'DC_VOLTAGE': {
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(0, -18);
        ctx.moveTo(0, 18);
        ctx.lineTo(0, 35);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', 0, -8);
        ctx.fillText('-', 0, 8);
        break;
      }

      case 'AC_VOLTAGE': {
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(0, -18);
        ctx.moveTo(0, 18);
        ctx.lineTo(0, 35);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.bezierCurveTo(-5, -10, 0, -10, 0, 0);
        ctx.bezierCurveTo(0, 10, 5, 10, 10, 0);
        ctx.stroke();
        break;
      }

      case 'AC_CURRENT': {
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(0, -18);
        ctx.moveTo(0, 18);
        ctx.lineTo(0, 35);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Flecha direcional da corrente fasorial apontando para pos (cima)
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.lineTo(0, -7);
        ctx.lineWidth = 2.4;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(-5, -3);
        ctx.lineTo(5, -3);
        ctx.closePath();
        ctx.fillStyle = isSelected ? '#00e5ff' : '#f8fafc';
        ctx.fill();
        break;
      }

      case 'JUNCTION_DOT': {
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#38bdf8' : '#00e5ff';
        ctx.fill();
        ctx.strokeStyle = '#0b0f19';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      case 'PULSE_VOLTAGE': {
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(0, -18);
        ctx.moveTo(0, 18);
        ctx.lineTo(0, 35);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.lineTo(-5, 6);
        ctx.lineTo(-5, -6);
        ctx.lineTo(5, -6);
        ctx.lineTo(5, 6);
        ctx.lineTo(10, 6);
        ctx.stroke();
        break;
      }

      case 'DIODE': {
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-12, 0);
        ctx.moveTo(12, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-12, -14);
        ctx.lineTo(12, 0);
        ctx.lineTo(-12, 14);
        ctx.closePath();
        ctx.fillStyle = isSelected ? '#00e5ff' : '#38bdf8';
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(12, -14);
        ctx.lineTo(12, 14);
        ctx.stroke();
        break;
      }

      case 'SWITCH': {
        const isClosed = comp.params.closed ?? true;
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-15, 0);
        ctx.moveTo(15, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-15, 0, 3, 0, Math.PI * 2);
        ctx.arc(15, 0, 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-15, 0);
        if (isClosed) {
          ctx.lineTo(15, 0);
        } else {
          ctx.lineTo(12, -16);
        }
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
      }

      case 'SPDT_SWITCH': {
        // Chave comutadora de duas posições: comum embaixo, contatos b (esq.) e a (dir.)
        const pos = comp.params.position === 'b' ? 'b' : 'a';

        // Haste do terminal comum
        ctx.beginPath();
        ctx.moveTo(0, 35);
        ctx.lineTo(0, 12);
        ctx.stroke();

        // Hastes dos contatos fixos
        ctx.beginPath();
        ctx.moveTo(-35, -30);
        ctx.lineTo(-22, -22);
        ctx.moveTo(35, -30);
        ctx.lineTo(22, -22);
        ctx.stroke();

        // Contatos (pequenos círculos)
        ctx.beginPath();
        ctx.arc(-22, -22, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(22, -22, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 12, 3, 0, Math.PI * 2);
        ctx.stroke();

        // Lâmina móvel apontando para o contato ativo
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(pos === 'a' ? 19 : -19, -19);
        ctx.lineWidth = 3;
        ctx.strokeStyle = isSelected ? '#00e5ff' : '#f59e0b';
        ctx.stroke();

        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('b', -34, -42);
        ctx.fillText('a', 34, -42);
        break;
      }

      case 'DEPENDENT_SOURCE': {
        const kind = comp.params.depType ?? 'VCVS';
        const isCurrentOut = kind === 'VCCS' || kind === 'CCCS';

        // Hastes principais
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(0, -20);
        ctx.moveTo(0, 20);
        ctx.lineTo(0, 35);
        ctx.stroke();

        // Losango (símbolo de fonte controlada)
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(18, 0);
        ctx.lineTo(0, 20);
        ctx.lineTo(-18, 0);
        ctx.closePath();
        ctx.stroke();

        if (isCurrentOut) {
          // Flecha de corrente
          ctx.beginPath();
          ctx.moveTo(0, 10);
          ctx.lineTo(0, -6);
          ctx.lineWidth = 2.2;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -11);
          ctx.lineTo(-5, -3);
          ctx.lineTo(5, -3);
          ctx.closePath();
          ctx.fillStyle = isSelected ? '#00e5ff' : '#f8fafc';
          ctx.fill();
        } else {
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isSelected ? '#00e5ff' : '#f8fafc';
          ctx.fillText('+', 0, -8);
          ctx.fillText('-', 0, 8);
        }

        // Pinos de controle (apenas nas fontes controladas por tensão)
        if (kind === 'VCVS' || kind === 'VCCS') {
          ctx.beginPath();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.moveTo(-50, -15);
          ctx.lineTo(-24, -15);
          ctx.moveTo(-50, 15);
          ctx.lineTo(-24, 15);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        break;
      }

      case 'VOLTMETER': {
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(0, -18);
        ctx.moveTo(0, 18);
        ctx.lineTo(0, 35);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();

        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('V', 0, 0);
        break;
      }

      case 'AMMETER': {
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-18, 0);
        ctx.moveTo(18, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', 0, 0);
        break;
      }

      case 'PORT_TERMINAL': {
        const pName = comp.params.portName || comp.params.label || 'a';
        const isB = pName.toLowerCase() === 'b';
        const strokeColor = isB ? '#f59e0b' : '#00e5ff';

        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#09101f';
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillStyle = strokeColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pName, 0, 0);
        break;
      }

      // --- Componentes Especializados de GTDC / SEP ---
      case 'POWER_BUS': {
        // Barra de Sistema de Potência (Barramento de Cobre / Dourado)
        const busColor = isSelected ? '#00e5ff' : '#eab308';
        ctx.fillStyle = busColor;
        ctx.beginPath();
        ctx.roundRect(-42, -5, 84, 10, 2);
        ctx.fill();

        // Linhas de conexão para os 6 pinos
        ctx.strokeStyle = busColor;
        ctx.lineWidth = 1.8;
        // Pinos superiores
        ctx.beginPath();
        ctx.moveTo(-35, -5); ctx.lineTo(-35, -16);
        ctx.moveTo(0, -5); ctx.lineTo(0, -16);
        ctx.moveTo(35, -5); ctx.lineTo(35, -16);
        // Pinos inferiores
        ctx.moveTo(-35, 5); ctx.lineTo(-35, 16);
        ctx.moveTo(0, 5); ctx.lineTo(0, 16);
        ctx.moveTo(35, 5); ctx.lineTo(35, 16);
        ctx.stroke();

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#060a12';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(comp.params.busType || 'BUS', 0, 0);
        break;
      }

      case 'TRANSMISSION_LINE': {
        // Linha de Transmissão Modelo Pi
        ctx.beginPath();
        ctx.moveTo(-50, 0); ctx.lineTo(-30, 0);
        ctx.moveTo(30, 0); ctx.lineTo(50, 0);
        ctx.stroke();

        ctx.fillStyle = '#091220';
        ctx.strokeStyle = isSelected ? '#00e5ff' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-30, -18, 60, 36, 4);
        ctx.fill();
        ctx.stroke();

        // Torre / Símbolo Pi
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillStyle = isSelected ? '#00e5ff' : '#38bdf8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Π', 0, -4);

        ctx.font = '8px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${comp.params.lengthKm ?? 300}km`, 0, 8);
        break;
      }

      case 'POWER_TRANSFORMER': {
        // Símbolo IEEE de Transformador de Potência (Dois círculos entrelaçados)
        ctx.beginPath();
        ctx.moveTo(-45, -20); ctx.lineTo(-24, -14);
        ctx.moveTo(-45, 20); ctx.lineTo(-24, 14);
        ctx.moveTo(45, -20); ctx.lineTo(24, -14);
        ctx.moveTo(45, 20); ctx.lineTo(24, 14);
        ctx.stroke();

        // Bobina Primária
        ctx.beginPath();
        ctx.arc(-12, 0, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#0a101d';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#00e5ff' : '#a855f7';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Bobina Secundária
        ctx.beginPath();
        ctx.arc(12, 0, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#0a101d';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#00e5ff' : '#a855f7';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#d8b4fe';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Y-Δ', 0, 0);
        break;
      }

      case 'SYNCHRONOUS_GENERATOR': {
        // Gerador Síncrono / Central de Potência
        ctx.beginPath();
        ctx.moveTo(0, -35); ctx.lineTo(0, -20);
        ctx.moveTo(0, 20); ctx.lineTo(0, 35);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#0a101d';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#00e5ff' : '#10b981';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillStyle = isSelected ? '#00e5ff' : '#10b981';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('G', 0, -2);

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#6ee7b7';
        ctx.fillText('3~', 0, 9);
        break;
      }

      case 'POWER_LOAD': {
        // Carga Industrial / de SEP (Caixa com flecha de absorção P + jQ)
        ctx.beginPath();
        ctx.moveTo(0, -35); ctx.lineTo(0, -16);
        ctx.moveTo(0, 16); ctx.lineTo(0, 35);
        ctx.stroke();

        ctx.fillStyle = '#09101d';
        ctx.strokeStyle = isSelected ? '#00e5ff' : '#f97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-22, -15, 44, 30, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = isSelected ? '#00e5ff' : '#f97316';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P+jQ', 0, 0);
        break;
      }

      case 'SHUNT_REACTOR': {
        // Reator Shunt de Compensação Reativa
        ctx.beginPath();
        ctx.moveTo(0, -35); ctx.lineTo(0, -18);
        ctx.moveTo(0, 18); ctx.lineTo(0, 35);
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
          const startY = -16 + i * 11;
          ctx.beginPath();
          ctx.arc(0, startY + 5.5, 5.5, -Math.PI / 2, Math.PI / 2, false);
          ctx.strokeStyle = isSelected ? '#00e5ff' : '#ec4899';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#f472b6';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('SHUNT', 10, 0);
        break;
      }

      case 'SERIES_CAPACITOR': {
        // Capacitor Série para Linha de Transmissão
        ctx.beginPath();
        ctx.moveTo(-40, 0); ctx.lineTo(-8, 0);
        ctx.moveTo(8, 0); ctx.lineTo(40, 0);
        ctx.stroke();

        ctx.lineWidth = 3.5;
        ctx.strokeStyle = isSelected ? '#00e5ff' : '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(-8, -18); ctx.lineTo(-8, 18);
        ctx.moveTo(8, -18); ctx.lineTo(8, 18);
        ctx.stroke();

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#67e8f9';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('SÉRIE', 0, -20);
        break;
      }
    }

    // Referência de corrente informada pelo enunciado, desenhada junto ao ramo.
    if (comp.params.currentDirection === 'FORWARD' || comp.params.currentDirection === 'REVERSE') {
      const naturalPair = branchTerminalPair(comp);
      if (naturalPair) {
        const pair = comp.params.currentDirection === 'REVERSE'
          ? [naturalPair[1], naturalPair[0]]
          : naturalPair;
        const from = comp.terminals.find(terminal => terminal.id === pair[0]);
        const to = comp.terminals.find(terminal => terminal.id === pair[1]);
        if (from && to) {
          const dx = to.relX - from.relX;
          const dy = to.relY - from.relY;
          const length = Math.hypot(dx, dy) || 1;
          const ux = dx / length;
          const uy = dy / length;
          const ox = -uy * 25;
          const oy = ux * 25;
          const startX = from.relX + ux * 8 + ox;
          const startY = from.relY + uy * 8 + oy;
          const endX = to.relX - ux * 8 + ox;
          const endY = to.relY - uy * 8 + oy;
          const headSize = 6;

          ctx.save();
          ctx.strokeStyle = '#22d3ee';
          ctx.fillStyle = '#22d3ee';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - ux * headSize - uy * headSize * 0.65, endY - uy * headSize + ux * headSize * 0.65);
          ctx.lineTo(endX - ux * headSize + uy * headSize * 0.65, endY - uy * headSize - ux * headSize * 0.65);
          ctx.closePath();
          ctx.fill();
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`i(${comp.params.label || comp.id})`, (startX + endX) / 2, (startY + endY) / 2 - 4);
          ctx.restore();
        }
      }
    }

    // Desenha os pinos/terminais do componente (com tamanho otimizado para toque)
    for (const t of comp.terminals) {
      const isHovered = hoverTerminalKey === `${comp.id}:${t.id}`;

      // Para PORT_TERMINAL ou JUNCTION_DOT em (0, 0), não sobrepõe com bolinha cinza
      if ((comp.type === 'PORT_TERMINAL' || comp.type === 'JUNCTION_DOT') && t.relX === 0 && t.relY === 0) {
        if (isHovered && comp.type === 'PORT_TERMINAL') {
          ctx.beginPath();
          ctx.arc(0, 0, 19, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        continue;
      }

      ctx.beginPath();
      ctx.arc(t.relX, t.relY, isHovered ? 6.5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? '#00e5ff' : '#64748b';
      ctx.fill();
      ctx.strokeStyle = isHovered ? '#ffffff' : '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (isHovered) {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    ctx.restore();

    if (comp.type !== 'JUNCTION_DOT') {
      this.drawComponentLabels(comp, vp, latestResult);
    }
  }

  private drawComponentLabels(
    comp: CircuitComponent,
    vp: ViewportTransform,
    latestResult: StepResult | null
  ) {
    const ctx = this.ctx;
    const center = this.toScreen({ x: comp.x, y: comp.y }, vp);

    ctx.save();
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';

    const label = comp.params.label || comp.type;
    ctx.fillText(label, center.x, center.y - 32 * vp.zoom);

    const valText = this.formatComponentValue(comp);
    if (valText) {
      ctx.font = '500 10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(valText, center.x, center.y + 36 * vp.zoom);
    }

    if (latestResult && (comp.type === 'VOLTMETER' || comp.type === 'AMMETER')) {
      const isV = comp.type === 'VOLTMETER';
      const val = isV
        ? latestResult.compVoltages.get(comp.id) ?? 0
        : latestResult.compCurrents.get(comp.id) ?? 0;
      const unit = isV ? 'V' : 'A';
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = isV ? '#38bdf8' : '#f59e0b';
      ctx.fillText(`${val.toFixed(2)} ${unit}`, center.x, center.y + 48 * vp.zoom);
    }

    ctx.restore();
  }

  private formatComponentValue(comp: CircuitComponent): string {
    const p = comp.params;
    switch (comp.type) {
      case 'RESISTOR':
        return this.formatSI(p.resistance ?? 1000, 'Ω');
      case 'CAPACITOR':
        if (p.reactance !== undefined) {
          const xVal = Math.abs(p.reactance);
          return `-j${xVal} Ω`;
        }
        return this.formatSI(p.capacitance ?? 10e-6, 'F');
      case 'INDUCTOR':
        if (p.reactance !== undefined) {
          return `j${p.reactance} Ω`;
        }
        return this.formatSI(p.inductance ?? 10e-3, 'H');
      case 'PORT_TERMINAL':
        return `Terminal ${p.portName || 'a'}`;
      case 'DC_VOLTAGE':
        return `${p.voltage ?? 12} V`;
      case 'AC_VOLTAGE':
        if (p.waveformFunction) return p.waveformFunction;
        if (p.complexValue) {
          const sign = p.complexValue.i >= 0 ? '+' : '-';
          return `${p.complexValue.r} ${sign} j${Math.abs(p.complexValue.i)} V`;
        }
        if (p.phase !== undefined && p.phase !== 0) {
          return `${p.amplitude ?? 120}∠${p.phase}° V`;
        }
        return `${p.amplitude ?? 120} V @ ${p.frequency ?? 60} Hz`;
      case 'AC_CURRENT':
        if (p.waveformFunction) return p.waveformFunction;
        if (p.complexValue) {
          const sign = p.complexValue.i >= 0 ? '+' : '-';
          return `${p.complexValue.r} ${sign} j${Math.abs(p.complexValue.i)} A`;
        }
        if (p.phase !== undefined && p.phase !== 0) {
          return `${this.formatSI(p.amplitude ?? 0.06, 'A')} ∠${p.phase}°`;
        }
        return `${this.formatSI(p.amplitude ?? 0.06, 'A')} @ ${p.frequency ?? 60} Hz`;
      case 'PULSE_VOLTAGE':
        return `${p.vHigh ?? 12}V PWM (${((p.dutyCycle ?? 0.5) * 100).toFixed(0)}%)`;
      case 'SWITCH':
        return (p.closed ?? true) ? 'FECHADO' : 'ABERTO';
      case 'SPDT_SWITCH':
        return `posição ${p.position === 'b' ? 'b' : 'a'} (t=${p.switchTime ?? 0})`;
      case 'DEPENDENT_SOURCE': {
        const kind = p.depType ?? 'VCVS';
        const g = p.gain ?? 1;
        if (kind === 'VCVS') return `${g}·v_c V`;
        if (kind === 'VCCS') return `${g}·v_c A`;
        if (kind === 'CCVS') return `${g}·i_${p.controlLabel || 'x'} V`;
        return `${g}·i_${p.controlLabel || 'x'} A`;
      }
      case 'JUNCTION_DOT':
        return '';
      case 'POWER_BUS':
        return `${p.nominalKv ?? 500} kV • ${p.busType || 'PQ'} (${p.puVoltage ?? 1.0} pu)`;
      case 'TRANSMISSION_LINE':
        return `${p.lengthKm ?? 300} km • ${p.nominalKv ?? 500} kV`;
      case 'POWER_TRANSFORMER':
        return `${p.mvaRating ?? 100} MVA • ${p.connectionType || 'Y-Δ'} (${p.xccPercent ?? 10}% Xcc)`;
      case 'SYNCHRONOUS_GENERATOR':
        return `${p.activePowerMw ?? 80} MW + j${p.reactivePowerMvar ?? 20} MVAr`;
      case 'POWER_LOAD':
        return `${p.activePowerMw ?? 80} MW + j${p.reactivePowerMvar ?? 40} MVAr`;
      case 'SHUNT_REACTOR':
        return `Reator: ${p.reactivePowerMvar ?? 100} MVAr`;
      case 'SERIES_CAPACITOR':
        return `Cap. Série (FC=${p.compensationFactor ?? 50}%)`;
      default:
        return '';
    }
  }

  private formatSI(value: number, unit: string): string {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} M${unit}`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)} k${unit}`;
    if (value >= 1) return `${value.toFixed(1)} ${unit}`;
    if (value >= 1e-3) return `${(value * 1e3).toFixed(1)} m${unit}`;
    if (value >= 1e-6) return `${(value * 1e6).toFixed(1)} µ${unit}`;
    if (value >= 1e-9) return `${(value * 1e9).toFixed(1)} n${unit}`;
    if (value >= 1e-12) return `${(value * 1e12).toFixed(1)} p${unit}`;
    return `${value} ${unit}`;
  }

  /**
   * Renderiza a linha guia ao arrastar para criar novo fio
   */
  public drawWiringPreview(fromPoint: Point, toPoint: Point, vp: ViewportTransform) {
    const ctx = this.ctx;
    const s1 = this.toScreen(fromPoint, vp);
    const s2 = this.toScreen(toPoint, vp);

    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.stroke();

    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(s2.x, s2.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
