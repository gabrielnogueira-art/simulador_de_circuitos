/**
 * Sistema de Memória de Soluções Verificadas (Gabaritos Oficiais e Calibração Few-Shot)
 * Guarda soluções confirmadas que batem com o gabarito oficial para alimentar a IA.
 */

import { OFFICIAL_EXERCISE_LISTS, OfficialExercise } from '../knowledge/circuitosIIData';
import { GTDC_EXERCISE_LISTS, GtdcExercise } from '../knowledge/gtdcData';

export interface VerifiedSolutionRecord {
  id: string;
  discipline?: 'circuitos2' | 'gtdc';
  listId: string;
  exerciseNumber?: string; // ex: "1.10", "2.4", "3.2", "4.5", "5.2", "6.7"
  title: string;
  topic: string;
  questionText: string;
  gabaritoOficial: string;
  verifiedMethodology: string;
  verifiedAt: number;
  userConfirmed: boolean;
  accuracyScore?: number; // 1.0 = 100% exato
}

const STORAGE_KEY = 'circuit_verified_solutions_memory_v1';

/**
 * Converte um exercício oficial de Circuitos II da base para o formato de memória verificada
 */
function toVerifiedRecord(ex: OfficialExercise): VerifiedSolutionRecord {
  return {
    id: ex.id,
    discipline: 'circuitos2',
    listId: ex.listId,
    exerciseNumber: ex.number,
    title: ex.title,
    topic: ex.topic,
    questionText: ex.questionText,
    gabaritoOficial: ex.gabarito,
    verifiedMethodology: `${ex.method}\nFórmulas-chave: ${ex.keyFormulas.join('; ')}`,
    verifiedAt: 1726700000000,
    userConfirmed: true,
    accuracyScore: 1.0,
  };
}

/**
 * Converte um exercício oficial de GTDC da base para o formato de memória verificada
 */
function toGtdcVerifiedRecord(ex: GtdcExercise): VerifiedSolutionRecord {
  return {
    id: ex.id,
    discipline: 'gtdc',
    listId: ex.listId,
    exerciseNumber: ex.number,
    title: ex.title,
    topic: ex.topic,
    questionText: ex.questionText,
    gabaritoOficial: ex.gabarito,
    verifiedMethodology: `${ex.method}\nFórmulas-chave: ${ex.keyFormulas.join('; ')}`,
    verifiedAt: 1726700000000,
    userConfirmed: true,
    accuracyScore: 1.0,
  };
}

/**
 * Retorna todas as soluções verificadas (armazenadas localmente + canônicas)
 */
export function getVerifiedSolutions(): VerifiedSolutionRecord[] {
  const canonicalRecords = [
    ...OFFICIAL_EXERCISE_LISTS.map(toVerifiedRecord),
    ...GTDC_EXERCISE_LISTS.map(toGtdcVerifiedRecord),
  ];

  if (typeof window === 'undefined') {
    return canonicalRecords;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Salva a base canônica inicial
      localStorage.setItem(STORAGE_KEY, JSON.stringify(canonicalRecords));
      return canonicalRecords;
    }
    const stored: VerifiedSolutionRecord[] = JSON.parse(raw);
    const storedMap = new Map(stored.map(r => [r.id, r]));

    // Mescla garantindo que a base canônica sempre exista
    for (const c of canonicalRecords) {
      if (!storedMap.has(c.id)) {
        storedMap.set(c.id, c);
      }
    }
    return Array.from(storedMap.values());
  } catch (e) {
    console.error('Erro ao ler memória de soluções verificadas:', e);
    return canonicalRecords;
  }
}

/**
 * Salva uma nova solução confirmada na memória permanente do sistema
 */
export function saveVerifiedSolution(record: Omit<VerifiedSolutionRecord, 'id' | 'verifiedAt'>): VerifiedSolutionRecord {
  const current = getVerifiedSolutions();
  const id = record.exerciseNumber
    ? `ex_${record.listId}_${record.exerciseNumber.replace(/\./g, '_')}`
    : `custom_${Date.now()}`;

  const fullRecord: VerifiedSolutionRecord = {
    ...record,
    id,
    verifiedAt: Date.now(),
    userConfirmed: true,
  };

  const updated = [fullRecord, ...current.filter(r => r.id !== id)];

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao persistir na memória:', e);
    }
  }

  return fullRecord;
}

/**
 * Encontra a solução verificada mais relevante para uma determinada pergunta ou circuito
 */
export function findMatchingVerifiedSolutions(question: string, circuitSummary: string = ''): VerifiedSolutionRecord[] {
  const all = getVerifiedSolutions();
  if (!question && !circuitSummary) return [];

  const lowerQ = question.toLowerCase();
  const lowerC = circuitSummary.toLowerCase();

  // 1. Busca por número exato de exercício (ex: "1.10", "exercício 2.4", "questão 3.16")
  const exerciseMatch = lowerQ.match(/(?:exerc[ií]cio|quest[ãa]o|item|lista\s*[123]\s*[-–]?\s*)?([123]\.\d{1,2})/i);
  if (exerciseMatch) {
    const targetNum = exerciseMatch[1];
    const exact = all.filter(r => r.exerciseNumber === targetNum);
    if (exact.length > 0) {
      return exact;
    }
  }

  // 2. Pontuação por palavras-chave e tokens
  const scored = all.map(record => {
    let score = 0;
    const recText = `${record.exerciseNumber} ${record.title} ${record.topic} ${record.questionText} ${record.gabaritoOficial}`.toLowerCase();

    // Palavras-chave temáticas
    const keywords = ['thévenin', 'thevenin', 'norton', 'supernó', 'superno', 'supermalha', 'superposição', 'superposicao', 'potência', 'potencia', 'máxima', 'admitância', 'admitancia', 'impedância', 'impedancia', 'fasor', 'fasores', 'defasagem', 'fator de potência'];
    for (const kw of keywords) {
      if (lowerQ.includes(kw) && recText.includes(kw)) {
        score += 3;
      }
    }

    // Termos numéricos e símbolos coincidentes
    const tokens = lowerQ.split(/\s+/).filter(t => t.length >= 3);
    for (const token of tokens) {
      if (recText.includes(token)) {
        score += 1;
      }
    }

    // Se o netlist do circuito compartilha componentes
    if (lowerC) {
      if (lowerC.includes('ac_current') && recText.includes('corrente')) score += 1;
      if (lowerC.includes('dependent_source') && recText.includes('dependente')) score += 2;
    }

    return { record, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score >= 3).slice(0, 3).map(s => s.record);
}

/**
 * Formata o bloco de contexto verificado para ser injetado no prompt da IA
 */
export function formatVerifiedContextForPrompt(matches: VerifiedSolutionRecord[]): string {
  if (matches.length === 0) return '';

  const lines: string[] = [];
  lines.push('======================================================');
  lines.push('MEMÓRIA DE GABARITOS E RESOLUÇÕES VERIFICADAS (PADRÃO OURO IFF):');
  lines.push('As seguintes resoluções foram validadas matematicamente e batem com o gabarito oficial.');
  lines.push('Use estes métodos e respostas comprovadas para guiar o cálculo com 100% de exatidão:');
  lines.push('');

  for (const m of matches) {
    lines.push(`▶ [Gabarito Verificado] ${m.exerciseNumber ? `Exercício ${m.exerciseNumber}: ` : ''}${m.title}`);
    lines.push(`Enunciado base: ${m.questionText}`);
    lines.push(`GABARITO OFICIAL: ${m.gabaritoOficial}`);
    lines.push(`Metodologia comprovada: ${m.verifiedMethodology}`);
    lines.push('---');
  }
  lines.push('======================================================');

  return lines.join('\n');
}
