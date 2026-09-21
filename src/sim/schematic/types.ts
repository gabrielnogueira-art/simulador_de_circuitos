// Definições de tipos para o editor esquemático e simulador PLECS

export type SystemMode = 'circuitos_ii' | 'gtdc';

export type ComponentType =
  | 'RESISTOR'
  | 'CAPACITOR'
  | 'INDUCTOR'
  | 'GROUND'
  | 'DC_VOLTAGE'
  | 'AC_VOLTAGE'
  | 'AC_CURRENT'      // Fonte de Corrente AC / Fasorial (ex: ig(t) = 60cos(10000t) mA)
  | 'PULSE_VOLTAGE'
  | 'DIODE'
  | 'SWITCH'
  | 'SPDT_SWITCH'     // Chave comutadora de duas posições (a / b)
  | 'DEPENDENT_SOURCE'// Fonte dependente (VCVS, VCCS, CCVS, CCCS)
  | 'VOLTMETER'
  | 'AMMETER'
  | 'PORT_TERMINAL'   // Terminal de teste a ou b
  | 'JUNCTION_DOT'    // Ponto de nó/derivação elétrica em fios (T-junction)
  // Componentes de Sistemas Elétricos de Potência (GTDC / SEP):
  | 'POWER_BUS'            // Barra / Barramento de Sistema (Slack / PV / PQ)
  | 'TRANSMISSION_LINE'    // Linha de Transmissão (Modelo Pi com R, XL, BC, km)
  | 'POWER_TRANSFORMER'    // Transformador de Potência (MVA, kV, Xcc%, Y-Delta)
  | 'SYNCHRONOUS_GENERATOR'// Gerador Síncrono / Usina de Potência
  | 'POWER_LOAD'           // Carga Trifásica / Sistema (P + jQ, MW, MVAr)
  | 'SHUNT_REACTOR'        // Reator de Compensação Shunt (MVAr)
  | 'SERIES_CAPACITOR';    // Banco de Capacitores Série (FC %)

/** Tipos de fonte dependente (controlada) */
export type DependentSourceKind = 'VCVS' | 'VCCS' | 'CCVS' | 'CCCS';

export interface Point {
  x: number;
  y: number;
}

export interface TerminalDef {
  id: string;
  name: string;
  relX: number;
  relY: number;
}

export interface ComponentParams {
  label?: string;
  resistance?: number;    // Ohms
  capacitance?: number;   // Farads (ex: 100e-6 para 100uF)
  inductance?: number;    // Henrys (ex: 1e-3 para 1mH)
  reactance?: number;     // Reatância complexa direta em Ohms (ex: -12, -16 para capacitor, +15 para indutor)
  voltage?: number;       // Volts DC
  amplitude?: number;     // Volts pico ou Amperes pico AC
  frequency?: number;     // Hz
  omega?: number;         // Frequência angular rad/s
  phase?: number;         // graus
  offset?: number;        // Volts DC offset
  dutyCycle?: number;     // 0 a 1 (ex: 0.5)
  vHigh?: number;         // Tensão nível alto do PWM
  vLow?: number;          // Tensão nível baixo do PWM
  vDrop?: number;         // Queda direta do diodo (ex: 0.7V ou 0V)
  closed?: boolean;       // Estado da chave/interruptor
  initialVoltage?: number;// Tensão inicial do capacitor
  initialCurrent?: number;// Corrente inicial do indutor
  portName?: 'a' | 'b' | string; // Identificador da porta de impedância
  mode?: 'REACTANCE' | 'PHYSICAL'; // Modo de especificação (reatância direta jX vs valor físico H/F)
  waveformFunction?: string; // Expressão matemática (ex: "10cos(2t) V", "60cos(10.000t) mA", "40+j80 mA")
  complexValue?: { r: number; i: number }; // Fasor retangular explícito
  current?: number;       // Corrente nominal AC/DC em Amperes
  depType?: DependentSourceKind; // Tipo da fonte dependente
  gain?: number;          // Ganho da fonte dependente (adimensional, S, Ω ou A/A)
  controlLabel?: string;  // Rótulo do elemento cuja corrente controla (CCVS/CCCS)
  position?: 'a' | 'b';   // Posição atual da chave comutadora de duas posições
  switchTime?: number;    // Instante de comutação da chave (t = 0 por padrão)
  currentDirection?: 'AUTO' | 'FORWARD' | 'REVERSE'; // Referência visual: ordem natural ou invertida dos terminais
  currentLabel?: string;  // Rótulo da corrente associada (ex: "ix", "io")

  // --- Propriedades Especializadas para GTDC / SEP ---
  busType?: 'SLACK' | 'PV' | 'PQ'; // Tipo de barra
  nominalKv?: number;              // Tensão nominal de linha (kV) ex: 13.8, 138, 230, 500
  mvaRating?: number;              // Potência nominal trifásica em MVA
  activePowerMw?: number;          // Potência ativa P (MW)
  reactivePowerMvar?: number;      // Potência reativa Q (MVAr)
  lengthKm?: number;               // Comprimento da Linha de Transmissão em km
  rPerKm?: number;                 // Resistência por km (Ω/km)
  xPerKm?: number;                 // Reatância indutiva por km (Ω/km)
  bPerKm?: number;                 // Susceptância capacitiva por km (µS/km)
  xccPercent?: number;             // Reatância de curto-circuito do transformador em %
  connectionType?: 'Y-Y' | 'Y-DELTA' | 'DELTA-Y' | 'DELTA-DELTA'; // Conexão do transformador
  phaseShiftDeg?: number;          // Defasagem angular (ex: 30° no trafo Y-Delta)
  compensationFactor?: number;     // Fator de compensação FC em % (ex: 50%)
  puVoltage?: number;              // Tensão de barra em pu (ex: 1.0, 1.05)
}

export interface CurrentArrowConfig {
  direction: 'forward' | 'reverse'; // forward: fromComp -> toComp, reverse: toComp -> fromComp
  label?: string; // ex: "ix", "io", "i1", "Ia"
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  params: ComponentParams;
  terminals: TerminalDef[];
}

export interface Wire {
  id: string;
  fromCompId: string;
  fromTerminalId: string;
  toCompId: string;
  toTerminalId: string;
  waypoints?: Point[]; // Pontos de dobra manuais do fio
  currentArrow?: CurrentArrowConfig; // Seta de corrente para indicação no enunciado
}

export interface ScopeSignalPoint {
  time: number;
  value: number;
}

export interface ScopeSignal {
  id: string;
  name: string;
  unit: string;
  color: string;
  visible: boolean;
  data: ScopeSignalPoint[];
}

export interface SimulationMetrics {
  vpp?: number;
  rms?: number;
  mean?: number;
  max?: number;
  min?: number;
  freq?: number;
}
