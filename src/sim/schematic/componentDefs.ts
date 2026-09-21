import { CircuitComponent, ComponentParams, ComponentType, Point, TerminalDef } from './types';

let nextCompId = 1;

export function generateId(prefix: string = 'comp'): string {
  return `${prefix}_${Date.now().toString(36)}_${(nextCompId++).toString(36)}`;
}

export function getDefaultParams(type: ComponentType): ComponentParams {
  switch (type) {
    case 'RESISTOR':
      return { label: 'R', resistance: 1000 };
    case 'CAPACITOR':
      return { label: 'C', capacitance: 10e-6, initialVoltage: 0 };
    case 'INDUCTOR':
      return { label: 'L', inductance: 10e-3, initialCurrent: 0 };
    case 'GROUND':
      return { label: 'GND' };
    case 'DC_VOLTAGE':
      return { label: 'V_DC', voltage: 12 };
    case 'AC_VOLTAGE':
      return { label: 'V_AC', amplitude: 120, frequency: 60, phase: 0, offset: 0 };
    case 'AC_CURRENT':
      return {
        label: 'i_g',
        amplitude: 0.06, // 60 mA
        frequency: 60,
        omega: 10000,
        phase: 0,
        waveformFunction: '60 cos(10.000t) mA',
        current: 0.06
      };
    case 'PULSE_VOLTAGE':
      return { label: 'V_PWM', vHigh: 12, vLow: 0, frequency: 1000, dutyCycle: 0.5 };
    case 'DIODE':
      return { label: 'D', vDrop: 0.7 };
    case 'SWITCH':
      return { label: 'SW', closed: true };
    case 'SPDT_SWITCH':
      return { label: 'S', position: 'a', switchTime: 0 };
    case 'DEPENDENT_SOURCE':
      return { label: 'E1', depType: 'VCVS', gain: 2, controlLabel: '' };
    case 'VOLTMETER':
      return { label: 'V_Meter' };
    case 'AMMETER':
      return { label: 'A_Meter' };
    case 'PORT_TERMINAL':
      return { label: 'Port_a', portName: 'a' };
    case 'JUNCTION_DOT':
      return { label: '' };

    // Componentes de Sistemas Elétricos de Potência (GTDC / SEP)
    case 'POWER_BUS':
      return {
        label: 'Barra 1',
        busType: 'PQ',
        nominalKv: 500,
        puVoltage: 1.0,
        phase: 0
      };
    case 'TRANSMISSION_LINE':
      return {
        label: 'LT 500kV',
        lengthKm: 300,
        nominalKv: 500,
        rPerKm: 0.03,
        xPerKm: 0.32,
        bPerKm: 3.5,
        resistance: 9,      // 0.03 * 300
        inductance: 0.2546, // (0.32 * 300) / (2 * pi * 60)
        capacitance: 2.78e-6 // (3.5e-6 * 300) / (2 * pi * 60)
      };
    case 'POWER_TRANSFORMER':
      return {
        label: 'Trafo 100MVA',
        mvaRating: 100,
        nominalKv: 500,
        voltage: 13.8,
        xccPercent: 10,
        connectionType: 'Y-DELTA',
        phaseShiftDeg: 30,
        resistance: 0.5,
        inductance: 0.066
      };
    case 'SYNCHRONOUS_GENERATOR':
      return {
        label: 'Gerador G1',
        mvaRating: 100,
        nominalKv: 13.8,
        activePowerMw: 80,
        reactivePowerMvar: 20,
        puVoltage: 1.05,
        amplitude: 11268, // (13.8 kV / sqrt(3)) * sqrt(2)
        frequency: 60,
        phase: 0
      };
    case 'POWER_LOAD':
      return {
        label: 'Carga SEP',
        nominalKv: 500,
        activePowerMw: 80,
        reactivePowerMvar: 40,
        resistance: 3125,
        inductance: 16.57
      };
    case 'SHUNT_REACTOR':
      return {
        label: 'Reator Shunt',
        nominalKv: 500,
        reactivePowerMvar: 100,
        inductance: 6.63
      };
    case 'SERIES_CAPACITOR':
      return {
        label: 'C_Série 50%',
        compensationFactor: 50,
        reactance: -48,
        capacitance: 55.2e-6
      };
  }
}

export function getDefaultTerminals(type: ComponentType): TerminalDef[] {
  switch (type) {
    case 'JUNCTION_DOT':
    case 'PORT_TERMINAL':
      return [
        { id: 'pin', name: 'Pin', relX: 0, relY: 0 }
      ];
    case 'RESISTOR':
    case 'INDUCTOR':
    case 'SERIES_CAPACITOR':
      return [
        { id: 't1', name: '1', relX: -40, relY: 0 },
        { id: 't2', name: '2', relX: 40, relY: 0 }
      ];
    case 'CAPACITOR':
      return [
        { id: 't1', name: '+', relX: -30, relY: 0 },
        { id: 't2', name: '-', relX: 30, relY: 0 }
      ];
    case 'GROUND':
      return [
        { id: 'gnd', name: '0', relX: 0, relY: -20 }
      ];
    case 'DC_VOLTAGE':
    case 'AC_VOLTAGE':
    case 'AC_CURRENT':
    case 'PULSE_VOLTAGE':
    case 'VOLTMETER':
    case 'SYNCHRONOUS_GENERATOR':
    case 'POWER_LOAD':
    case 'SHUNT_REACTOR':
      return [
        { id: 'pos', name: '+', relX: 0, relY: -35 },
        { id: 'neg', name: '-', relX: 0, relY: 35 }
      ];
    case 'DIODE':
      return [
        { id: 'anode', name: 'A', relX: -30, relY: 0 },
        { id: 'cathode', name: 'K', relX: 30, relY: 0 }
      ];
    case 'SWITCH':
      return [
        { id: 't1', name: '1', relX: -35, relY: 0 },
        { id: 't2', name: '2', relX: 35, relY: 0 }
      ];
    case 'SPDT_SWITCH':
      return [
        { id: 'com', name: 'com', relX: 0, relY: 35 },
        { id: 'a', name: 'a', relX: 35, relY: -30 },
        { id: 'b', name: 'b', relX: -35, relY: -30 }
      ];
    case 'DEPENDENT_SOURCE':
      return [
        { id: 'pos', name: '+', relX: 0, relY: -35 },
        { id: 'neg', name: '-', relX: 0, relY: 35 },
        { id: 'cp', name: 'C+', relX: -50, relY: -15 },
        { id: 'cn', name: 'C-', relX: -50, relY: 15 }
      ];
    case 'AMMETER':
      return [
        { id: 'in', name: 'In', relX: -35, relY: 0 },
        { id: 'out', name: 'Out', relX: 35, relY: 0 }
      ];
    case 'TRANSMISSION_LINE':
      return [
        { id: 't1', name: 'In', relX: -50, relY: 0 },
        { id: 't2', name: 'Out', relX: 50, relY: 0 }
      ];
    case 'POWER_TRANSFORMER':
      return [
        { id: 'p1', name: 'H1', relX: -45, relY: -20 },
        { id: 'p2', name: 'H2', relX: -45, relY: 20 },
        { id: 's1', name: 'X1', relX: 45, relY: -20 },
        { id: 's2', name: 'X2', relX: 45, relY: 20 }
      ];
    case 'POWER_BUS':
      return [
        { id: 't1', name: '1', relX: -35, relY: -16 },
        { id: 't2', name: '2', relX: 0, relY: -16 },
        { id: 't3', name: '3', relX: 35, relY: -16 },
        { id: 'b1', name: '4', relX: -35, relY: 16 },
        { id: 'b2', name: '5', relX: 0, relY: 16 },
        { id: 'b3', name: '6', relX: 35, relY: 16 }
      ];
  }
}

export function rotateRelPoint(relX: number, relY: number, rotation: number): Point {
  const norm = ((rotation % 360) + 360) % 360;
  switch (norm) {
    case 90:
      return { x: -relY, y: relX };
    case 180:
      return { x: -relX, y: -relY };
    case 270:
      return { x: relY, y: -relX };
    case 0:
    default:
      return { x: relX, y: relY };
  }
}

export function getTerminalAbsPosition(comp: CircuitComponent, terminalId: string): Point {
  const term = comp.terminals.find(t => t.id === terminalId);
  if (!term) return { x: comp.x, y: comp.y };
  const rot = rotateRelPoint(term.relX, term.relY, comp.rotation);
  return {
    x: comp.x + rot.x,
    y: comp.y + rot.y
  };
}

export function createComponent(type: ComponentType, x: number, y: number, rotation: number = 0): CircuitComponent {
  const params = getDefaultParams(type);
  const terminals = getDefaultTerminals(type);
  return {
    id: generateId(type.toLowerCase()),
    type,
    x,
    y,
    rotation,
    params,
    terminals
  };
}
