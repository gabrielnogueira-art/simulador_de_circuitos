import { Complex, ComplexMath } from './complex';
import { CircuitComponent, Wire } from '../schematic/types';
import { CircuitGraph } from '../schematic/circuitGraph';

export interface ImpedanceResult {
  z: Complex;
  mag: number;
  phaseDeg: number;
  nature: 'RESISTIVE' | 'INDUCTIVE' | 'CAPACITIVE';
  admittance: Complex;
  rectString: string;
  polarString: string;
  nodeAName: string;
  nodeBName: string;
}

export class ImpedanceSolver {
  /**
   * Calcula a impedância de Thévenin Zab entre dois terminais ou identificadores 'a' e 'b'
   */
  static calculateImpedance(
    components: CircuitComponent[],
    wires: Wire[],
    termA: { compId: string; terminalId: string },
    termB: { compId: string; terminalId: string },
    omega: number = 1 // Frequência angular padrão em rad/s
  ): ImpedanceResult | null {
    const netlist = CircuitGraph.buildNetlist(components, wires);
    const keyA = `${termA.compId}:${termA.terminalId}`;
    const keyB = `${termB.compId}:${termB.terminalId}`;

    const nA = netlist.terminalToNode.get(keyA);
    const nB = netlist.terminalToNode.get(keyB);

    if (nA === undefined || nB === undefined) {
      return null;
    }

    if (nA === nB) {
      // Mesmo nó: impedância nula
      return {
        z: { r: 0, i: 0 },
        mag: 0,
        phaseDeg: 0,
        nature: 'RESISTIVE',
        admittance: { r: 1e9, i: 0 },
        rectString: '0.0000 Ω',
        polarString: '0.0000 Ω ∠ 0.000°',
        nodeAName: `Nó ${nA}`,
        nodeBName: `Nó ${nB}`
      };
    }

    const N = netlist.nodeCount;
    if (N === 0) return null;

    // Matriz de admitâncias nodais complexa A (N x N) e vetor b (N)
    const A: Complex[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => ComplexMath.create(0, 0))
    );
    const b: Complex[] = Array.from({ length: N }, () => ComplexMath.create(0, 0));

    const stampAdmittance = (n1: number, n2: number, Y: Complex) => {
      if (n1 > 0) A[n1 - 1][n1 - 1] = ComplexMath.add(A[n1 - 1][n1 - 1], Y);
      if (n2 > 0) A[n2 - 1][n2 - 1] = ComplexMath.add(A[n2 - 1][n2 - 1], Y);
      if (n1 > 0 && n2 > 0) {
        A[n1 - 1][n2 - 1] = ComplexMath.sub(A[n1 - 1][n2 - 1], Y);
        A[n2 - 1][n1 - 1] = ComplexMath.sub(A[n2 - 1][n1 - 1], Y);
      }
    };

    const getNode = (compId: string, terminalId: string): number => {
      const key = `${compId}:${terminalId}`;
      return netlist.terminalToNode.get(key) ?? 0;
    };

    // Estampa todos os componentes com suas admitâncias complexas Y = 1 / Z
    for (const comp of components) {
      let Z: Complex | null = null;

      switch (comp.type) {
        case 'RESISTOR': {
          const r = Math.max(comp.params.resistance ?? 1000, 1e-6);
          Z = ComplexMath.create(r, 0);
          break;
        }

        case 'INDUCTOR': {
          if (comp.params.reactance !== undefined) {
            // Reatância direta jX (em Ohms)
            Z = ComplexMath.create(0, comp.params.reactance);
          } else {
            const l = Math.max(comp.params.inductance ?? 10e-3, 1e-12);
            Z = ComplexMath.create(0, omega * l);
          }
          break;
        }

        case 'CAPACITOR': {
          if (comp.params.reactance !== undefined) {
            // Reatância direta -jX (em Ohms)
            Z = ComplexMath.create(0, comp.params.reactance);
          } else {
            const c = Math.max(comp.params.capacitance ?? 10e-6, 1e-12);
            Z = ComplexMath.create(0, -1 / (omega * c));
          }
          break;
        }
      }

      if (Z) {
        const Y = ComplexMath.inv(Z);
        const t1 = comp.terminals[0]?.id || 't1';
        const t2 = comp.terminals[1]?.id || 't2';
        const n1 = getNode(comp.id, t1);
        const n2 = getNode(comp.id, t2);
        stampAdmittance(n1, n2, Y);
      }
    }

    // Injeta fonte de corrente fasorial de teste de 1A entre nó A e nó B
    if (nA > 0) b[nA - 1] = ComplexMath.add(b[nA - 1], ComplexMath.create(1, 0));
    if (nB > 0) b[nB - 1] = ComplexMath.sub(b[nB - 1], ComplexMath.create(1, 0));

    // Resolve o sistema linear complexo A * V = b via eliminação gaussiana com pivoteamento parcial
    const V = this.solveComplexSystem(A, b);
    if (!V) return null;

    const vA = nA > 0 ? V[nA - 1] : ComplexMath.create(0, 0);
    const vB = nB > 0 ? V[nB - 1] : ComplexMath.create(0, 0);

    // Zab = (Va - Vb) / 1A = Va - Vb
    const Zab = ComplexMath.sub(vA, vB);
    const mag = ComplexMath.mag(Zab);
    const phaseDeg = ComplexMath.phaseDeg(Zab);
    const Yab = ComplexMath.inv(Zab);

    let nature: 'RESISTIVE' | 'INDUCTIVE' | 'CAPACITIVE' = 'RESISTIVE';
    if (Zab.i > 1e-5) nature = 'INDUCTIVE';
    else if (Zab.i < -1e-5) nature = 'CAPACITIVE';

    return {
      z: Zab,
      mag,
      phaseDeg,
      nature,
      admittance: Yab,
      rectString: ComplexMath.formatRect(Zab, 'Ω'),
      polarString: ComplexMath.formatPolar(Zab, 'Ω'),
      nodeAName: `Terminal a (Nó ${nA})`,
      nodeBName: `Terminal b (Nó ${nB})`
    };
  }

  private static solveComplexSystem(A: Complex[][], b: Complex[]): Complex[] | null {
    const n = b.length;
    const M: Complex[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => ({ ...A[i][j] }))
    );
    const y: Complex[] = b.map(c => ({ ...c }));

    for (let k = 0; k < n; k++) {
      let maxMag = ComplexMath.mag(M[k][k]);
      let maxRow = k;

      for (let i = k + 1; i < n; i++) {
        const m = ComplexMath.mag(M[i][k]);
        if (m > maxMag) {
          maxMag = m;
          maxRow = i;
        }
      }

      if (maxMag < 1e-12) {
        // Amortecimento de condutância para nós flutuantes
        M[k][k] = ComplexMath.add(M[k][k], ComplexMath.create(1e-6, 0));
      } else if (maxRow !== k) {
        const tempRow = M[k];
        M[k] = M[maxRow];
        M[maxRow] = tempRow;

        const tempB = y[k];
        y[k] = y[maxRow];
        y[maxRow] = tempB;
      }

      const pivot = M[k][k];
      if (ComplexMath.mag(pivot) < 1e-14) continue;

      for (let i = k + 1; i < n; i++) {
        const factor = ComplexMath.div(M[i][k], pivot);
        M[i][k] = ComplexMath.create(0, 0);
        for (let j = k + 1; j < n; j++) {
          M[i][j] = ComplexMath.sub(M[i][j], ComplexMath.mul(factor, M[k][j]));
        }
        y[i] = ComplexMath.sub(y[i], ComplexMath.mul(factor, y[k]));
      }
    }

    const x: Complex[] = Array.from({ length: n }, () => ComplexMath.create(0, 0));
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i];
      for (let j = i + 1; j < n; j++) {
        sum = ComplexMath.sub(sum, ComplexMath.mul(M[i][j], x[j]));
      }
      const diag = M[i][i];
      if (ComplexMath.mag(diag) > 1e-14) {
        x[i] = ComplexMath.div(sum, diag);
      } else {
        x[i] = ComplexMath.create(0, 0);
      }
    }

    return x;
  }
}
