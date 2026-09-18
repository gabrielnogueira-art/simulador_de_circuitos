import { MatrixSolver } from './matrix';
import { CircuitComponent } from '../schematic/types';
import { CircuitNetlist } from '../schematic/circuitGraph';

export interface ComponentDynamicState {
  capVoltage?: number;  // Tensão anterior do capacitor (v_t1 - v_t2)
  indCurrent?: number;  // Corrente anterior do indutor (i_t1 -> t2)
  diodeState?: 'ON' | 'OFF';
  switchClosed?: boolean;
}

export interface StepResult {
  time: number;
  nodeVoltages: number[]; // v[0]=0 (GND), v[1..nodeCount]
  compVoltages: Map<string, number>;
  compCurrents: Map<string, number>;
}

export class MNASolver {
  private netlist: CircuitNetlist;
  private components: CircuitComponent[];
  private states: Map<string, ComponentDynamicState>;

  constructor(components: CircuitComponent[], netlist: CircuitNetlist) {
    this.components = components;
    this.netlist = netlist;
    this.states = new Map();

    // Inicializa estados dinâmicos
    for (const comp of components) {
      this.states.set(comp.id, {
        capVoltage: comp.params.initialVoltage ?? 0,
        indCurrent: comp.params.initialCurrent ?? 0,
        diodeState: 'OFF',
        switchClosed: comp.params.closed ?? true
      });
    }
  }

  public updateNetlist(components: CircuitComponent[], netlist: CircuitNetlist) {
    this.components = components;
    this.netlist = netlist;
    for (const comp of components) {
      if (!this.states.has(comp.id)) {
        this.states.set(comp.id, {
          capVoltage: comp.params.initialVoltage ?? 0,
          indCurrent: comp.params.initialCurrent ?? 0,
          diodeState: 'OFF',
          switchClosed: comp.params.closed ?? true
        });
      }
    }
  }

  public toggleSwitch(compId: string) {
    const st = this.states.get(compId);
    if (st) {
      st.switchClosed = !st.switchClosed;
    }
  }

  public setSwitch(compId: string, closed: boolean) {
    const st = this.states.get(compId);
    if (st) {
      st.switchClosed = closed;
    }
  }

  private getNode(compId: string, terminalId: string): number {
    const key = `${compId}:${terminalId}`;
    return this.netlist.terminalToNode.get(key) ?? 0;
  }

  /**
   * Executa um passo de integração no tempo t com passo dt.
   * Suporta iteração para convergência de semicondutores (diodos).
   */
  public step(time: number, dt: number): StepResult {
    const maxIterations = 15;
    let iter = 0;
    let stateChanged = true;

    let finalNodeVoltages: number[] = new Array(this.netlist.nodeCount + 1).fill(0);
    let finalAuxCurrents: number[] = [];
    let vsrcCompIds: string[] = [];

    while (stateChanged && iter < maxIterations) {
      iter++;
      stateChanged = false;

      // Identifica componentes que requerem equações auxiliares (fontes de tensão e amperímetros)
      vsrcCompIds = [];
      for (const comp of this.components) {
        if (comp.type === 'DC_VOLTAGE' || comp.type === 'AC_VOLTAGE' || comp.type === 'PULSE_VOLTAGE' || comp.type === 'AMMETER') {
          vsrcCompIds.push(comp.id);
        }
      }

      const N = this.netlist.nodeCount;
      const M = vsrcCompIds.length;
      const totalSize = N + M;

      // Cria matriz A (totalSize x totalSize) e vetor b (totalSize)
      const A: number[][] = Array.from({ length: totalSize }, () => new Array(totalSize).fill(0));
      const b: number[] = new Array(totalSize).fill(0);

      // Função auxiliar para estampar condutância entre nós n1 e n2
      const stampConductance = (n1: number, n2: number, g: number) => {
        if (n1 > 0) A[n1 - 1][n1 - 1] += g;
        if (n2 > 0) A[n2 - 1][n2 - 1] += g;
        if (n1 > 0 && n2 > 0) {
          A[n1 - 1][n2 - 1] -= g;
          A[n2 - 1][n1 - 1] -= g;
        }
      };

      // Função auxiliar para estampar fonte de corrente paralela fluindo de n2 para n1
      const stampCurrentSource = (n1: number, n2: number, iVal: number) => {
        if (n1 > 0) b[n1 - 1] += iVal;
        if (n2 > 0) b[n2 - 1] -= iVal;
      };

      // Estampa todos os componentes passivos e companion models
      for (const comp of this.components) {
        const st = this.states.get(comp.id)!;

        switch (comp.type) {
          case 'RESISTOR': {
            const n1 = this.getNode(comp.id, 't1');
            const n2 = this.getNode(comp.id, 't2');
            const r = Math.max(comp.params.resistance ?? 1000, 1e-6);
            stampConductance(n1, n2, 1 / r);
            break;
          }

          case 'CAPACITOR': {
            // Modelo Companion Backward Euler: G_eq = C / dt, I_eq = G_eq * v_c(t-dt)
            const n1 = this.getNode(comp.id, 't1');
            const n2 = this.getNode(comp.id, 't2');
            const c = Math.max(comp.params.capacitance ?? 10e-6, 1e-12);
            const geq = c / dt;
            stampConductance(n1, n2, geq);
            const ieq = geq * (st.capVoltage ?? 0);
            // Ieq flui de t2 para t1
            stampCurrentSource(n1, n2, ieq);
            break;
          }

          case 'INDUCTOR': {
            // Modelo Companion Backward Euler: G_eq = dt / L, I_eq = -i_L(t-dt)
            const n1 = this.getNode(comp.id, 't1');
            const n2 = this.getNode(comp.id, 't2');
            const l = Math.max(comp.params.inductance ?? 10e-3, 1e-12);
            const geq = dt / l;
            stampConductance(n1, n2, geq);
            const iPrev = st.indCurrent ?? 0;
            // i_L flui de t1 para t2. Termo histórico em RHS: -iPrev no nó 1, +iPrev no nó 2
            if (n1 > 0) b[n1 - 1] -= iPrev;
            if (n2 > 0) b[n2 - 1] += iPrev;
            break;
          }

          case 'SWITCH': {
            const n1 = this.getNode(comp.id, 't1');
            const n2 = this.getNode(comp.id, 't2');
            const isClosed = st.switchClosed ?? comp.params.closed ?? true;
            const r = isClosed ? 1e-4 : 1e7;
            stampConductance(n1, n2, 1 / r);
            break;
          }

          case 'DIODE': {
            // Modelo piecewise linear PLECS
            const n1 = this.getNode(comp.id, 'anode');
            const n2 = this.getNode(comp.id, 'cathode');
            const vDrop = comp.params.vDrop ?? 0.7;
            const isOn = st.diodeState === 'ON';
            if (isOn) {
              const rOn = 0.01;
              const gOn = 1 / rOn;
              stampConductance(n1, n2, gOn);
              // Ieq = vDrop / rOn fluindo no sentido reverso para subtrair a queda
              const ieq = -vDrop / rOn;
              stampCurrentSource(n1, n2, ieq);
            } else {
              const rOff = 1e6;
              stampConductance(n1, n2, 1 / rOff);
            }
            break;
          }

          case 'VOLTMETER': {
            // Alta impedância de teste
            const n1 = this.getNode(comp.id, 'pos');
            const n2 = this.getNode(comp.id, 'neg');
            stampConductance(n1, n2, 1e-9);
            break;
          }
        }
      }

      // Estampa fontes de tensão e amperímetros nas linhas auxiliares
      for (let k = 0; k < vsrcCompIds.length; k++) {
        const comp = this.components.find(c => c.id === vsrcCompIds[k])!;
        const row = N + k;

        let nPos = 0;
        let nNeg = 0;
        let vVal = 0;

        if (comp.type === 'DC_VOLTAGE') {
          nPos = this.getNode(comp.id, 'pos');
          nNeg = this.getNode(comp.id, 'neg');
          vVal = comp.params.voltage ?? 12;
        } else if (comp.type === 'AC_VOLTAGE') {
          nPos = this.getNode(comp.id, 'pos');
          nNeg = this.getNode(comp.id, 'neg');
          const amp = comp.params.amplitude ?? 120;
          const freq = comp.params.frequency ?? 60;
          const phaseRad = ((comp.params.phase ?? 0) * Math.PI) / 180;
          const offset = comp.params.offset ?? 0;
          vVal = amp * Math.sin(2 * Math.PI * freq * time + phaseRad) + offset;
        } else if (comp.type === 'PULSE_VOLTAGE') {
          nPos = this.getNode(comp.id, 'pos');
          nNeg = this.getNode(comp.id, 'neg');
          const vHigh = comp.params.vHigh ?? 12;
          const vLow = comp.params.vLow ?? 0;
          const freq = Math.max(comp.params.frequency ?? 1000, 1e-3);
          const period = 1 / freq;
          const duty = Math.min(Math.max(comp.params.dutyCycle ?? 0.5, 0), 1);
          const tMod = ((time % period) + period) % period;
          vVal = tMod < duty * period ? vHigh : vLow;
        } else if (comp.type === 'AMMETER') {
          nPos = this.getNode(comp.id, 'in');
          nNeg = this.getNode(comp.id, 'out');
          vVal = 0; // Tensão nula (curto-circuito ideal de medição)
        }

        if (nPos > 0) {
          A[row][nPos - 1] = 1;
          A[nPos - 1][row] = 1;
        }
        if (nNeg > 0) {
          A[row][nNeg - 1] = -1;
          A[nNeg - 1][row] = -1;
        }
        b[row] = vVal;
      }

      // Resolve o sistema A * x = b
      const x = MatrixSolver.solve(A, b);
      if (!x) {
        break; // Matriz singular ou insolúvel
      }

      finalNodeVoltages = [0];
      for (let i = 0; i < N; i++) {
        finalNodeVoltages.push(x[i]);
      }
      finalAuxCurrents = x.slice(N);

      // Verificação de comutação dos diodos (Piecewise Linear PLECS Iteration)
      for (const comp of this.components) {
        if (comp.type === 'DIODE') {
          const st = this.states.get(comp.id)!;
          const n1 = this.getNode(comp.id, 'anode');
          const n2 = this.getNode(comp.id, 'cathode');
          const vAnode = n1 > 0 ? finalNodeVoltages[n1] : 0;
          const vCathode = n2 > 0 ? finalNodeVoltages[n2] : 0;
          const vDiode = vAnode - vCathode;
          const vDrop = comp.params.vDrop ?? 0.7;

          if (st.diodeState === 'OFF') {
            if (vDiode > vDrop + 0.001) {
              st.diodeState = 'ON';
              stateChanged = true;
            }
          } else {
            // Quando ON, a corrente é (vDiode - vDrop) / rOn
            const iDiode = (vDiode - vDrop) / 0.01;
            if (iDiode < -1e-6) {
              st.diodeState = 'OFF';
              stateChanged = true;
            }
          }
        }
      }
    }

    // Calcula tensões e correntes individuais dos componentes para sondas e animação
    const compVoltages = new Map<string, number>();
    const compCurrents = new Map<string, number>();

    for (const comp of this.components) {
      const st = this.states.get(comp.id)!;

      switch (comp.type) {
        case 'RESISTOR': {
          const n1 = this.getNode(comp.id, 't1');
          const n2 = this.getNode(comp.id, 't2');
          const v1 = n1 > 0 ? finalNodeVoltages[n1] : 0;
          const v2 = n2 > 0 ? finalNodeVoltages[n2] : 0;
          const v = v1 - v2;
          const r = Math.max(comp.params.resistance ?? 1000, 1e-6);
          const i = v / r;
          compVoltages.set(comp.id, v);
          compCurrents.set(comp.id, i);
          break;
        }

        case 'CAPACITOR': {
          const n1 = this.getNode(comp.id, 't1');
          const n2 = this.getNode(comp.id, 't2');
          const v1 = n1 > 0 ? finalNodeVoltages[n1] : 0;
          const v2 = n2 > 0 ? finalNodeVoltages[n2] : 0;
          const v = v1 - v2;
          const c = Math.max(comp.params.capacitance ?? 10e-6, 1e-12);
          const vPrev = st.capVoltage ?? 0;
          const i = c * (v - vPrev) / dt;
          st.capVoltage = v;
          compVoltages.set(comp.id, v);
          compCurrents.set(comp.id, i);
          break;
        }

        case 'INDUCTOR': {
          const n1 = this.getNode(comp.id, 't1');
          const n2 = this.getNode(comp.id, 't2');
          const v1 = n1 > 0 ? finalNodeVoltages[n1] : 0;
          const v2 = n2 > 0 ? finalNodeVoltages[n2] : 0;
          const v = v1 - v2;
          const l = Math.max(comp.params.inductance ?? 10e-3, 1e-12);
          const iPrev = st.indCurrent ?? 0;
          const i = iPrev + (dt / l) * v;
          st.indCurrent = i;
          compVoltages.set(comp.id, v);
          compCurrents.set(comp.id, i);
          break;
        }

        case 'SWITCH': {
          const n1 = this.getNode(comp.id, 't1');
          const n2 = this.getNode(comp.id, 't2');
          const v1 = n1 > 0 ? finalNodeVoltages[n1] : 0;
          const v2 = n2 > 0 ? finalNodeVoltages[n2] : 0;
          const v = v1 - v2;
          const isClosed = st.switchClosed ?? comp.params.closed ?? true;
          const r = isClosed ? 1e-4 : 1e7;
          const i = v / r;
          compVoltages.set(comp.id, v);
          compCurrents.set(comp.id, i);
          break;
        }

        case 'DIODE': {
          const n1 = this.getNode(comp.id, 'anode');
          const n2 = this.getNode(comp.id, 'cathode');
          const v1 = n1 > 0 ? finalNodeVoltages[n1] : 0;
          const v2 = n2 > 0 ? finalNodeVoltages[n2] : 0;
          const v = v1 - v2;
          const vDrop = comp.params.vDrop ?? 0.7;
          let i = 0;
          if (st.diodeState === 'ON') {
            i = (v - vDrop) / 0.01;
          } else {
            i = v / 1e6;
          }
          compVoltages.set(comp.id, v);
          compCurrents.set(comp.id, i);
          break;
        }

        case 'VOLTMETER': {
          const n1 = this.getNode(comp.id, 'pos');
          const n2 = this.getNode(comp.id, 'neg');
          const v1 = n1 > 0 ? finalNodeVoltages[n1] : 0;
          const v2 = n2 > 0 ? finalNodeVoltages[n2] : 0;
          const v = v1 - v2;
          compVoltages.set(comp.id, v);
          compCurrents.set(comp.id, 0);
          break;
        }

        case 'DC_VOLTAGE':
        case 'AC_VOLTAGE':
        case 'PULSE_VOLTAGE':
        case 'AMMETER': {
          const idx = vsrcCompIds.indexOf(comp.id);
          const i = idx >= 0 ? finalAuxCurrents[idx] : 0;
          let v = 0;
          if (comp.type === 'AMMETER') {
            const n1 = this.getNode(comp.id, 'in');
            const n2 = this.getNode(comp.id, 'out');
            v = (n1 > 0 ? finalNodeVoltages[n1] : 0) - (n2 > 0 ? finalNodeVoltages[n2] : 0);
          } else {
            const n1 = this.getNode(comp.id, 'pos');
            const n2 = this.getNode(comp.id, 'neg');
            v = (n1 > 0 ? finalNodeVoltages[n1] : 0) - (n2 > 0 ? finalNodeVoltages[n2] : 0);
          }
          compVoltages.set(comp.id, v);
          // A corrente de ramo MNA positiva é aquela que entra pelo terminal positivo
          compCurrents.set(comp.id, i);
          break;
        }
      }
    }

    return {
      time,
      nodeVoltages: finalNodeVoltages,
      compVoltages,
      compCurrents
    };
  }

  public resetStates() {
    for (const comp of this.components) {
      this.states.set(comp.id, {
        capVoltage: comp.params.initialVoltage ?? 0,
        indCurrent: comp.params.initialCurrent ?? 0,
        diodeState: 'OFF',
        switchClosed: comp.params.closed ?? true
      });
    }
  }

  public getComponentState(compId: string) {
    return this.states.get(compId);
  }
}
