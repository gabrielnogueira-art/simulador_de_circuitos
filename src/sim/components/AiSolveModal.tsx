import { useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Send, Loader2, Square, ImagePlus, Trash2, BookmarkCheck, CheckCircle2, BookOpen, Award } from 'lucide-react';
import { CircuitComponent, Wire } from '../schematic/types';
import { describeCircuit } from '../ai/describeCircuit';
import { AiCircuitDirections } from './AiCircuitDirections';
import {
  saveVerifiedSolution,
  findMatchingVerifiedSolutions,
  formatVerifiedContextForPrompt,
  VerifiedSolutionRecord,
} from '../ai/verifiedMemory';
import { OFFICIAL_EXERCISE_LISTS } from '../knowledge/circuitosIIData';
import { GTDC_EXERCISE_LISTS } from '../knowledge/gtdcData';

interface AiSolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
  wires: Wire[];
}

const EXAMPLES = [
  'Calcule a impedância equivalente vista pelos terminais a-b.',
  'Determine a corrente em cada malha pelo método das malhas.',
  'Ache a tensão nos nós usando análise nodal.',
  'Calcule a potência complexa entregue à carga e o fator de potência.',
  'Encontre v(t) para t > 0 após a comutação da chave.',
];

export function AiSolveModal({ isOpen, onClose, components, wires }: AiSolveModalProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [decimals, setDecimals] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [images, setImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<'circuitos2' | 'gtdc'>('circuitos2');
  const [activeTab, setActiveTab] = useState<string>('geral');
  const [isSavedToMemory, setIsSavedToMemory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const loaded = await Promise.all(
      Array.from(files)
        .filter(f => f.type.startsWith('image/') && f.size > 0)
        .slice(0, 4)
        .map(
          f =>
            new Promise<{ name: string; dataUrl: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ name: f.name, dataUrl: String(reader.result) });
              reader.onerror = () => reject(new Error('read'));
              reader.readAsDataURL(f);
            }),
        ),
    ).catch(() => []);
    if (loaded.length > 0) setImages(prev => [...prev, ...loaded].slice(0, 4));
    if (fileRef.current) fileRef.current.value = '';
  };

  const matchingSolutions = useMemo(() => {
    return findMatchingVerifiedSolutions(question, describeCircuit(components, wires));
  }, [question, components, wires]);

  const handleSolve = async () => {
    if ((!question.trim() && images.length === 0) || isLoading) return;
    setIsLoading(true);
    setError(null);
    setAnswer('');
    setHasStarted(true);
    setIsSavedToMemory(false);

    const controller = new AbortController();
    abortRef.current = controller;

    const verifiedContext = formatVerifiedContextForPrompt(matchingSolutions);

    try {
      const res = await fetch('/api/ai-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          circuit: describeCircuit(components, wires),
          decimals,
          verifiedContext,
          images: images.map(img => img.dataUrl),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setError((await res.text().catch(() => '')) || 'Não foi possível resolver agora.');
        setIsLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAnswer(acc);
      }
      if (!acc.trim()) setError('A IA não retornou resposta. Tente reformular a pergunta.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError('Falha de conexão ao consultar a IA.');
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  if (!isOpen) return null;

  const showMeshes = /malha|mesh|lkt/i.test(question);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400">
              <Sparkles className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Resolver com IA</h2>
              <p className="text-[11px] text-slate-400">
                A IA lê o circuito montado e resolve exatamente o que a questão pede.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-slate-800">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            rows={3}
            placeholder="Cole aqui o enunciado ou descreva o que precisa ser calculado..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-y"
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={e => handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 hover:text-cyan-300 hover:border-cyan-600 transition-colors"
              >
                <ImagePlus className="w-3.5 h-3.5" /> Enviar foto da questão
              </button>
              <span className="text-[11px] text-slate-500">
                {images.length > 0 ? `${images.length}/4 foto(s)` : 'Tire uma foto ou anexe até 4 imagens'}
              </span>
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={`${img.name}-${i}`} className="relative">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-20 h-20 object-cover rounded-lg border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reconhecimento automático de Gabarito Oficial */}
          {matchingSolutions.length > 0 && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2 animate-in fade-in">
              <Award className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-300">
                  Gabarito Oficial Reconhecido ({matchingSolutions[0].exerciseNumber ? `Exercício ${matchingSolutions[0].exerciseNumber}` : matchingSolutions[0].title}):
                </span>{' '}
                <span className="font-mono text-emerald-200">{matchingSolutions[0].gabaritoOficial}</span>
              </div>
            </div>
          )}

          {/* Abas das Listas de Exercícios do IFF */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-300">Base de Exercícios do IFF:</span>
                <div className="flex items-center gap-1 ml-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDiscipline('circuitos2');
                      setActiveTab('geral');
                    }}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                      selectedDiscipline === 'circuitos2'
                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚡ Circuitos II
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDiscipline('gtdc');
                      setActiveTab('gtdc_l1');
                    }}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                      selectedDiscipline === 'gtdc'
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🏭 GTDC / SEP
                  </button>
                </div>
              </div>

              {/* Seletor de Listas da Disciplina Ativa */}
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 overflow-x-auto max-w-full">
                {selectedDiscipline === 'circuitos2' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('geral')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'geral' ? 'bg-slate-800 text-cyan-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      Geral
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('lista1')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'lista1' ? 'bg-slate-800 text-cyan-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      1ª (Fasores)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('lista2')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'lista2' ? 'bg-slate-800 text-cyan-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      2ª (Análise CA)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('lista3')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'lista3' ? 'bg-slate-800 text-cyan-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      3ª (Potência)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('lista4')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'lista4' ? 'bg-slate-800 text-cyan-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      4ª (Trifásicos Eq.)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('lista5')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'lista5' ? 'bg-slate-800 text-cyan-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      5ª (Trifásicos Deseq.)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('lista6')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'lista6' ? 'bg-slate-800 text-cyan-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      6ª (Laplace)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gtdc_l1')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'gtdc_l1' ? 'bg-slate-800 text-emerald-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      1ª (Revisão CA)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gtdc_l2')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'gtdc_l2' ? 'bg-slate-800 text-emerald-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      2ª (Sistemas PU)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gtdc_l3')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'gtdc_l3' ? 'bg-slate-800 text-emerald-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      3ª (SEP em PU)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gtdc_l4')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'gtdc_l4' ? 'bg-slate-800 text-emerald-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      4ª (Matrizes Y/Z)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gtdc_l5')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'gtdc_l5' ? 'bg-slate-800 text-emerald-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      5ª (Linhas LT)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gtdc_l6')}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${activeTab === 'gtdc_l6' ? 'bg-slate-800 text-emerald-300 font-bold' : 'hover:text-slate-200'}`}
                    >
                      6ª (Compensação)
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto py-1">
              {activeTab === 'geral' &&
                EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setQuestion(ex);
                      setIsSavedToMemory(false);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-cyan-300 hover:border-cyan-600 transition-colors"
                  >
                    {ex}
                  </button>
                ))}

              {selectedDiscipline === 'circuitos2' &&
                activeTab !== 'geral' &&
                OFFICIAL_EXERCISE_LISTS.filter(ex => ex.listId === activeTab).map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setQuestion(`Exercício ${ex.number}: ${ex.questionText}`);
                      setIsSavedToMemory(false);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors"
                    title={`Gabarito: ${ex.gabarito}`}
                  >
                    <span className="font-bold text-cyan-400 mr-1">{ex.number}</span>
                    <span>{ex.title}</span>
                  </button>
                ))}

              {selectedDiscipline === 'gtdc' &&
                GTDC_EXERCISE_LISTS.filter(ex => ex.listId === activeTab).map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setQuestion(`Exercício ${ex.number}: ${ex.questionText}`);
                      setIsSavedToMemory(false);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-[11px] text-slate-300 hover:text-emerald-300 transition-colors"
                    title={`Gabarito: ${ex.gabarito}`}
                  >
                    <span className="font-bold text-emerald-400 mr-1">{ex.number}</span>
                    <span>{ex.title}</span>
                  </button>
                ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[11px] text-slate-400">
              Casas decimais:
              <input
                type="number"
                min={2}
                max={8}
                value={decimals}
                onChange={e => setDecimals(Math.min(8, Math.max(2, parseInt(e.target.value) || 4)))}
                className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </label>

            <div className="flex items-center gap-2">
              {isLoading && (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  <Square className="w-3 h-3" /> Parar
                </button>
              )}
              <button
                onClick={handleSolve}
                disabled={isLoading || (!question.trim() && images.length === 0)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:from-fuchsia-400 hover:to-cyan-300 transition-all cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {isLoading ? 'Resolvendo...' : 'Resolver'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {hasStarted && (
            <AiCircuitDirections components={components} wires={wires} showMeshes={showMeshes} />
          )}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          {!error && !answer && !isLoading && (
            <p className="text-xs text-slate-500">
              Monte o circuito na prancheta, escreva o enunciado acima e a resolução aparecerá aqui,
              passo a passo.
            </p>
          )}

          {isLoading && !answer && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              Analisando o circuito e montando a resolução calibrada...
            </div>
          )}

          {answer && (
            <div className="space-y-4">
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-cyan-300 prose-strong:text-emerald-300 prose-code:text-amber-300">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>

              {/* Cartão de Confirmação e Memória do Gabarito */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${isSavedToMemory ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {isSavedToMemory ? <BookmarkCheck className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      {isSavedToMemory ? 'Resolução salva na memória da IA!' : 'O resultado bate com o gabarito oficial?'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isSavedToMemory
                        ? 'Esta resolução comprovada agora guiará a IA para resolver questões semelhantes com o método correto.'
                        : 'Guarde esta resposta para alimentar o aprendizado da IA com o caminho correto.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSavedToMemory}
                  onClick={() => {
                    const match = matchingSolutions[0];
                    saveVerifiedSolution({
                      discipline: selectedDiscipline,
                      listId: match?.listId || (selectedDiscipline === 'gtdc' ? 'gtdc_l1' : 'lista1'),
                      exerciseNumber: match?.exerciseNumber,
                      title: match?.title || question.slice(0, 45) + (question.length > 45 ? '...' : ''),
                      topic: match?.topic || (selectedDiscipline === 'gtdc' ? 'GTDC / SEP' : 'Circuitos II'),
                      questionText: question,
                      gabaritoOficial: match?.gabaritoOficial || answer.slice(0, 300),
                      verifiedMethodology: answer,
                      userConfirmed: true,
                      accuracyScore: 1.0,
                    });
                    setIsSavedToMemory(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                    isSavedToMemory
                      ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 cursor-pointer'
                  }`}
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>{isSavedToMemory ? 'Salvo na Memória ✅' : 'Bateu com o Gabarito (Salvar)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
