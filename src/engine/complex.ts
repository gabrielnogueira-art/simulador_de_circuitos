// Biblioteca de números complexos para análise de circuitos em regime permanente AC

export interface Complex {
  r: number; // Parte real (resistiva)
  i: number; // Parte imaginária (reativa)
}

export class ComplexMath {
  static create(r: number, i: number = 0): Complex {
    return { r, i };
  }

  static add(a: Complex, b: Complex): Complex {
    return { r: a.r + b.r, i: a.i + b.i };
  }

  static sub(a: Complex, b: Complex): Complex {
    return { r: a.r - b.r, i: a.i - b.i };
  }

  static mul(a: Complex, b: Complex): Complex {
    return {
      r: a.r * b.r - a.i * b.i,
      i: a.r * b.i + a.i * b.r
    };
  }

  static div(a: Complex, b: Complex): Complex {
    const denom = b.r * b.r + b.i * b.i;
    if (Math.abs(denom) < 1e-16) {
      return { r: 1e12, i: 0 };
    }
    return {
      r: (a.r * b.r + a.i * b.i) / denom,
      i: (a.i * b.r - a.r * b.i) / denom
    };
  }

  static inv(a: Complex): Complex {
    return ComplexMath.div({ r: 1, i: 0 }, a);
  }

  static mag(a: Complex): number {
    return Math.hypot(a.r, a.i);
  }

  static phaseDeg(a: Complex): number {
    return (Math.atan2(a.i, a.r) * 180) / Math.PI;
  }

  /**
   * Formata na notação retangular: R + jX Ω
   */
  static formatRect(a: Complex, unit: string = 'Ω'): string {
    const rStr = a.r.toFixed(5).replace(/\.?0+$/, '');
    const iAbs = Math.abs(a.i).toFixed(5).replace(/\.?0+$/, '');
    if (Math.abs(a.i) < 1e-6) {
      return `${rStr} ${unit}`;
    }
    if (Math.abs(a.r) < 1e-6) {
      return `${a.i >= 0 ? 'j' : '-j'}${iAbs} ${unit}`;
    }
    const sign = a.i >= 0 ? '+' : '-';
    return `${rStr} ${sign} j${iAbs} ${unit}`;
  }

  /**
   * Formata na notação polar: |Z| ∠ θ°
   */
  static formatPolar(a: Complex, unit: string = 'Ω'): string {
    const mag = ComplexMath.mag(a).toFixed(4);
    const phase = ComplexMath.phaseDeg(a).toFixed(3);
    return `${mag} ${unit} ∠ ${phase}°`;
  }
}
