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
    case 'PULSE_VOLTAGE':
      return { label: 'V_PWM', vHigh: 12, vLow: 0, frequency: 1000, dutyCycle: 0.5 };
    case 'DIODE':
      return { label: 'D', vDrop: 0.7 };
    case 'SWITCH':
      return { label: 'SW', closed: true };
    case 'VOLTMETER':
      return { label: 'V_Meter' };
    case 'AMMETER':
      return { label: 'A_Meter' };
    case 'PORT_TERMINAL':
      return { label: 'Port_a', portName: 'a' };
  }
}

export function getDefaultTerminals(type: ComponentType): TerminalDef[] {
  switch (type) {
    case 'PORT_TERMINAL':
      return [
        { id: 'pin', name: 'Pin', relX: 0, relY: 0 }
      ];
    case 'RESISTOR':
    case 'INDUCTOR':
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
    case 'PULSE_VOLTAGE':
    case 'VOLTMETER':
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
    case 'AMMETER':
      return [
        { id: 'in', name: 'In', relX: -35, relY: 0 },
        { id: 'out', name: 'Out', relX: 35, relY: 0 }
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
