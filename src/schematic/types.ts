// Definições de tipos para o editor esquemático e simulador PLECS

export type ComponentType =
  | 'RESISTOR'
  | 'CAPACITOR'
  | 'INDUCTOR'
  | 'GROUND'
  | 'DC_VOLTAGE'
  | 'AC_VOLTAGE'
  | 'PULSE_VOLTAGE'
  | 'DIODE'
  | 'SWITCH'
  | 'VOLTMETER'
  | 'AMMETER'
  | 'PORT_TERMINAL'; // Terminal de teste a ou b

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
  amplitude?: number;     // Volts pico AC
  frequency?: number;     // Hz
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
