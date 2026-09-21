// Solucionador matricial robusto para sistemas lineares A * x = b (MNA)

export class MatrixSolver {
  /**
   * Resolve o sistema linear A * x = b usando eliminação gaussiana com pivoteamento parcial.
   * Retorna o vetor x ou null caso singular.
   */
  static solve(A: number[][], b: number[]): number[] | null {
    const n = b.length;
    if (n === 0) return [];

    // Cria cópias para não modificar os arrays originais
    const M: number[][] = new Array(n);
    const y: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      M[i] = new Array(n);
      for (let j = 0; j < n; j++) {
        M[i][j] = A[i][j];
      }
      y[i] = b[i];
    }

    // Eliminação progressiva com pivoteamento parcial
    for (let k = 0; k < n; k++) {
      let maxVal = Math.abs(M[k][k]);
      let maxRow = k;
      for (let i = k + 1; i < n; i++) {
        const val = Math.abs(M[i][k]);
        if (val > maxVal) {
          maxVal = val;
          maxRow = i;
        }
      }

      // Se o pivô for quase zero, adicionamos um amortecimento mínimo para evitar singularidade de nós flutuantes
      if (maxVal < 1e-12) {
        M[k][k] += 1e-6;
      } else if (maxRow !== k) {
        // Troca linhas k e maxRow
        const tempRow = M[k];
        M[k] = M[maxRow];
        M[maxRow] = tempRow;

        const tempB = y[k];
        y[k] = y[maxRow];
        y[maxRow] = tempB;
      }

      const pivot = M[k][k];
      if (Math.abs(pivot) < 1e-14) {
        continue;
      }

      // Elimina as entradas abaixo do pivô
      for (let i = k + 1; i < n; i++) {
        const factor = M[i][k] / pivot;
        M[i][k] = 0;
        for (let j = k + 1; j < n; j++) {
          M[i][j] -= factor * M[k][j];
        }
        y[i] -= factor * y[k];
      }
    }

    // Substituição regressiva
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i];
      for (let j = i + 1; j < n; j++) {
        sum -= M[i][j] * x[j];
      }
      const diag = M[i][i];
      if (Math.abs(diag) > 1e-14) {
        x[i] = sum / diag;
      } else {
        x[i] = 0;
      }
    }

    return x;
  }
}
