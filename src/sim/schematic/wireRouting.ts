import { CircuitComponent, Point, Wire } from './types';
import { getTerminalAbsPosition } from './componentDefs';

export interface WireSegment {
  p1: Point;
  p2: Point;
  isHorizontal: boolean;
  index: number;
}

export class WireRouting {
  /**
   * Retorna a lista completa de pontos estritamente ortogonais (Manhattan) de um fio
   */
  static getOrthogonalPoints(wire: Wire, compMap: Map<string, CircuitComponent>): Point[] {
    const c1 = compMap.get(wire.fromCompId);
    const c2 = compMap.get(wire.toCompId);
    if (!c1 || !c2) return [];

    const start = getTerminalAbsPosition(c1, wire.fromTerminalId);
    const end = getTerminalAbsPosition(c2, wire.toTerminalId);

    if (wire.waypoints && wire.waypoints.length > 0) {
      // Garante que a sequência com waypoints seja estritamente ortogonal
      const raw = [start, ...wire.waypoints, end];
      return WireRouting.cleanCollinear(WireRouting.enforceOrthogonal(raw));
    }

    // Rota ortogonal padrão inicial
    if (Math.abs(start.x - end.x) < 2 || Math.abs(start.y - end.y) < 2) {
      return [start, end];
    }

    // Traçado padrão em degrau
    return [start, { x: end.x, y: start.y }, end];
  }

  /**
   * Força que todos os pontos consecutivos formem apenas segmentos horizontais ou verticais
   */
  private static enforceOrthogonal(points: Point[]): Point[] {
    if (points.length <= 1) return points;
    const res: Point[] = [points[0]];

    for (let i = 0; i < points.length - 1; i++) {
      const pA = res[res.length - 1];
      const pB = points[i + 1];

      const dx = Math.abs(pB.x - pA.x);
      const dy = Math.abs(pB.y - pA.y);

      if (dx < 1e-4 || dy < 1e-4) {
        // Já é horizontal ou vertical
        res.push(pB);
      } else {
        // Insere curva em L a 90 graus
        res.push({ x: pB.x, y: pA.y });
        res.push(pB);
      }
    }

    return res;
  }

  /**
   * Remove pontos colineares redundantes em linha reta
   */
  private static cleanCollinear(points: Point[]): Point[] {
    if (points.length <= 2) return points;
    const res: Point[] = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = res[res.length - 1];
      const curr = points[i];
      const next = points[i + 1];

      const isH = Math.abs(prev.y - curr.y) < 1e-3 && Math.abs(curr.y - next.y) < 1e-3;
      const isV = Math.abs(prev.x - curr.x) < 1e-3 && Math.abs(curr.x - next.x) < 1e-3;

      if (!isH && !isV) {
        res.push(curr);
      }
    }

    res.push(points[points.length - 1]);
    return res;
  }

  /**
   * Retorna os segmentos do fio com orientação (horizontal/vertical) e índice
   */
  static getSegments(wire: Wire, compMap: Map<string, CircuitComponent>): WireSegment[] {
    const pts = WireRouting.getOrthogonalPoints(wire, compMap);
    const segs: WireSegment[] = [];

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const isHorizontal = Math.abs(p1.y - p2.y) <= Math.abs(p1.x - p2.x);
      segs.push({
        p1,
        p2,
        isHorizontal,
        index: i
      });
    }

    return segs;
  }

  /**
   * Identifica se um ponto clicado está sobre um trecho do fio
   */
  static findSegmentAt(
    worldPt: Point,
    wire: Wire,
    compMap: Map<string, CircuitComponent>,
    tolerance: number = 10
  ): WireSegment | null {
    const segments = WireRouting.getSegments(wire, compMap);

    for (const seg of segments) {
      const dist = WireRouting.distToSegment(worldPt, seg.p1, seg.p2);
      if (dist <= tolerance) {
        return seg;
      }
    }

    return null;
  }

  /**
   * Arrasta um trecho horizontal (ajustando Y) ou vertical (ajustando X) preservando ligações a 90°
   */
  static dragSegment(
    wire: Wire,
    compMap: Map<string, CircuitComponent>,
    segmentIndex: number,
    newCoord: number // newY se for horizontal, newX se for vertical
  ): Point[] {
    const pts = [...WireRouting.getOrthogonalPoints(wire, compMap)];
    if (pts.length < 2 || segmentIndex < 0 || segmentIndex >= pts.length - 1) {
      return wire.waypoints || [];
    }

    const seg = WireRouting.getSegments(wire, compMap)[segmentIndex];
    if (!seg) return wire.waypoints || [];

    const isH = seg.isHorizontal;
    const m = pts.length;

    // Se o fio tiver apenas 1 segmento reto inicial (ex: start -> end)
    if (m === 2) {
      const start = pts[0];
      const end = pts[1];
      if (isH) {
        // Fio horizontal: mover em Y cria um U ou Z ortogonal
        return [
          { x: start.x, y: newCoord },
          { x: end.x, y: newCoord }
        ];
      } else {
        // Fio vertical: mover em X cria um U ou Z ortogonal
        return [
          { x: newCoord, y: start.y },
          { x: newCoord, y: end.y }
        ];
      }
    }

    // Se for o primeiro segmento (conectado ao terminal inicial P0)
    if (segmentIndex === 0) {
      const p0 = pts[0];
      const p1 = pts[1];
      if (isH) {
        // Trecho horizontal inicial: move Y inserindo um degrau vertical inicial em p0
        pts.splice(1, 1, { x: p0.x, y: newCoord }, { x: p1.x, y: newCoord });
      } else {
        // Trecho vertical inicial: move X inserindo um degrau horizontal inicial em p0
        pts.splice(1, 1, { x: newCoord, y: p0.y }, { x: newCoord, y: p1.y });
      }
    } else if (segmentIndex === m - 2) {
      // Se for o último segmento (conectado ao terminal final P_end)
      const pEndMinus1 = pts[m - 2];
      const pEnd = pts[m - 1];
      if (isH) {
        pts.splice(m - 2, 1, { x: pEndMinus1.x, y: newCoord }, { x: pEnd.x, y: newCoord });
      } else {
        pts.splice(m - 2, 1, { x: newCoord, y: pEndMinus1.y }, { x: newCoord, y: pEnd.y });
      }
    } else {
      // Trecho intermediário interno: ajusta os dois pontos que definem o trecho
      if (isH) {
        pts[segmentIndex].y = newCoord;
        pts[segmentIndex + 1].y = newCoord;
      } else {
        pts[segmentIndex].x = newCoord;
        pts[segmentIndex + 1].x = newCoord;
      }
    }

    const clean = WireRouting.cleanCollinear(pts);
    // Retorna apenas os waypoints internos (excluindo start P0 e end P_last)
    return clean.slice(1, clean.length - 1);
  }

  private static distToSegment(p: Point, v: Point, w: Point): number {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }
}
