import { CircuitComponent, Wire, ScopeSignal } from '../schematic/types';
import { CircuitGraph } from '../schematic/circuitGraph';
import { MNASolver, StepResult } from './mnaSolver';

export class SimulationEngine {
  private components: CircuitComponent[] = [];
  private wires: Wire[] = [];
  private solver: MNASolver | null = null;

  public currentTime: number = 0;
  public timeStep: number = 1e-5; // 10 us (ótimo para conversores chaveados e circuitos RLC)
  public isRunning: boolean = false;
  public subStepsPerFrame: number = 25; // 25 passos por frame a 60fps = 15 ms de circuito por segundo de tela

  // Histórico para o osciloscópio
  public signals: Map<string, ScopeSignal> = new Map();
  private maxScopePoints: number = 2000;

  // Último resultado para animação de partículas e leitura instantânea
  public latestResult: StepResult | null = null;
  private animationFrameId: number | null = null;
  private onUpdateCallback: (() => void) | null = null;

  constructor(components: CircuitComponent[] = [], wires: Wire[] = []) {
    this.init(components, wires);
  }

  public init(components: CircuitComponent[], wires: Wire[]) {
    this.components = components;
    this.wires = wires;
    const netlist = CircuitGraph.buildNetlist(components, wires);

    if (!this.solver) {
      this.solver = new MNASolver(components, netlist);
    } else {
      this.solver.updateNetlist(components, netlist);
    }

    this.syncScopeChannels();
  }

  public setOnUpdate(cb: () => void) {
    this.onUpdateCallback = cb;
  }

  public toggleSwitch(compId: string) {
    if (this.solver) {
      this.solver.toggleSwitch(compId);
    }
  }

  /**
   * Sincroniza canais do osciloscópio com voltímetros, amperímetros e componentes relevantes
   */
  public syncScopeChannels() {
    const channelColors = ['#00e5ff', '#ffeb3b', '#e91e63', '#00e676', '#ff9100', '#b388ff'];
    let colorIdx = 0;

    const activeProbes = this.components.filter(
      c => c.type === 'VOLTMETER' || c.type === 'AMMETER'
    );

    // Mantém canais existentes ou cria novos
    const newSignals = new Map<string, ScopeSignal>();

    for (const probe of activeProbes) {
      const existing = this.signals.get(probe.id);
      const isVolt = probe.type === 'VOLTMETER';
      const defaultName = probe.params.label || (isVolt ? `V(${probe.id.slice(0, 6)})` : `I(${probe.id.slice(0, 6)})`);
      const color = existing ? existing.color : channelColors[colorIdx % channelColors.length];
      colorIdx++;

      newSignals.set(probe.id, {
        id: probe.id,
        name: defaultName,
        unit: isVolt ? 'V' : 'A',
        color,
        visible: existing ? existing.visible : true,
        data: existing ? existing.data : []
      });
    }

    this.signals = newSignals;
  }

  /**
   * Executa um único passo de tempo
   */
  public stepOnce(): StepResult | null {
    if (!this.solver) return null;
    const res = this.solver.step(this.currentTime, this.timeStep);
    this.currentTime += this.timeStep;
    this.latestResult = res;

    // Registra dados nas sondas do osciloscópio
    for (const [probeId, sig] of this.signals.entries()) {
      const isVolt = sig.unit === 'V';
      const val = isVolt
        ? res.compVoltages.get(probeId) ?? 0
        : res.compCurrents.get(probeId) ?? 0;

      sig.data.push({ time: res.time, value: val });
      if (sig.data.length > this.maxScopePoints) {
        sig.data.shift();
      }
    }

    return res;
  }

  /**
   * Inicia simulação contínua interativa em tempo real
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;

      for (let i = 0; i < this.subStepsPerFrame; i++) {
        this.stepOnce();
      }

      if (this.onUpdateCallback) {
        this.onUpdateCallback();
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Pausa a simulação
   */
  public pause() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Reinicia o tempo e estados para zero
   */
  public reset() {
    this.pause();
    this.currentTime = 0;
    if (this.solver) {
      this.solver.resetStates();
    }
    for (const sig of this.signals.values()) {
      sig.data = [];
    }
    this.latestResult = null;
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  /**
   * Simulação em lote (Batch Run estilo PLECS padrão):
   * Simula de 0 a stopDuration e gera curvas completas para análise no Scope
   */
  public runBatch(stopDuration: number = 0.05, dt: number = 1e-5) {
    this.reset();
    this.timeStep = dt;
    const totalSteps = Math.floor(stopDuration / dt);
    const maxDataPoints = 3000;
    const downsampleRate = Math.max(1, Math.floor(totalSteps / maxDataPoints));

    for (let step = 0; step < totalSteps; step++) {
      if (!this.solver) break;
      const res = this.solver.step(this.currentTime, this.timeStep);
      this.currentTime += this.timeStep;
      this.latestResult = res;

      if (step % downsampleRate === 0) {
        for (const [probeId, sig] of this.signals.entries()) {
          const isVolt = sig.unit === 'V';
          const val = isVolt
            ? res.compVoltages.get(probeId) ?? 0
            : res.compCurrents.get(probeId) ?? 0;
          sig.data.push({ time: res.time, value: val });
        }
      }
    }

    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  public getSolver() {
    return this.solver;
  }
}
