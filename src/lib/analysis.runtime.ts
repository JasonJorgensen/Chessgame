import type { PieceSymbol, Square } from "chess.js";

export type EngineDifficulty = "easy" | "medium" | "hard" | "expert";

export type ParsedMove = {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
};

export type AnalysisLine = {
  multipv: number;
  depth: number;
  evaluation: string;
  pv: string[];
};

export type AnalysisResult = {
  bestMove: ParsedMove | null;
  lines: AnalysisLine[];
};

type SearchOptions = {
  fen: string;
  moveTimeMs: number;
  multipv?: number;
  skillLevel?: number;
};

type ActiveSearch = {
  id: number;
  resolve: (result: AnalysisResult) => void;
  reject: (error: Error) => void;
  lines: Map<number, AnalysisLine>;
  bestMove: ParsedMove | null;
};

const WORKER_URL = "/stockfish/stockfish-18-asm.js";

const DIFFICULTY_PRESETS: Record<
  EngineDifficulty,
  { moveTimeMs: number; analysisTimeMs: number; skillLevel: number }
> = {
  easy: { moveTimeMs: 80, analysisTimeMs: 120, skillLevel: 3 },
  medium: { moveTimeMs: 140, analysisTimeMs: 220, skillLevel: 8 },
  hard: { moveTimeMs: 250, analysisTimeMs: 420, skillLevel: 14 },
  expert: { moveTimeMs: 420, analysisTimeMs: 700, skillLevel: 20 },
};

const parseMove = (uciMove: string): ParsedMove | null => {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uciMove)) {
    return null;
  }

  return {
    from: uciMove.slice(0, 2) as Square,
    to: uciMove.slice(2, 4) as Square,
    promotion: uciMove[4] as PieceSymbol | undefined,
  };
};

const formatEvaluation = (line: string): string | null => {
  const mateMatch = line.match(/score mate (-?\d+)/);
  if (mateMatch) {
    const plies = Number(mateMatch[1]);
    return plies > 0 ? `Mate in ${plies}` : `Mated in ${Math.abs(plies)}`;
  }

  const centipawnMatch = line.match(/score cp (-?\d+)/);
  if (!centipawnMatch) {
    return null;
  }

  return `${(Number(centipawnMatch[1]) / 100).toFixed(1)}`;
};

const parseInfoLine = (line: string): AnalysisLine | null => {
  if (!line.startsWith("info ") || !line.includes(" pv ")) {
    return null;
  }

  const depthMatch = line.match(/\bdepth (\d+)/);
  const pvMatch = line.match(/\bpv (.+)$/);
  const multipvMatch = line.match(/\bmultipv (\d+)/);
  const evaluation = formatEvaluation(line);

  if (!depthMatch || !pvMatch || !evaluation) {
    return null;
  }

  return {
    multipv: multipvMatch ? Number(multipvMatch[1]) : 1,
    depth: Number(depthMatch[1]),
    evaluation,
    pv: pvMatch[1].trim().split(/\s+/),
  };
};

const createSearchId = (() => {
  let nextId = 1;
  return () => nextId++;
})();

export class AnalysisRuntime {
  private worker: Worker;
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private activeSearch: ActiveSearch | null = null;

  constructor() {
    this.worker = new Worker(WORKER_URL);
    this.readyPromise = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });
    this.worker.onmessage = (event: MessageEvent<string>) => {
      this.handleMessage(String(event.data));
    };
    this.post("uci");
    this.post("isready");
  }

  async getBestMove(
    fen: string,
    difficulty: EngineDifficulty,
  ): Promise<ParsedMove | null> {
    const preset = DIFFICULTY_PRESETS[difficulty];
    const result = await this.searchPosition({
      fen,
      moveTimeMs: preset.moveTimeMs,
      skillLevel: preset.skillLevel,
      multipv: 1,
    });
    return result.bestMove;
  }

  async analyzePosition(
    fen: string,
    difficulty: EngineDifficulty,
  ): Promise<AnalysisResult> {
    const preset = DIFFICULTY_PRESETS[difficulty];
    return this.searchPosition({
      fen,
      moveTimeMs: preset.analysisTimeMs,
      skillLevel: preset.skillLevel,
      multipv: 3,
    });
  }

  stop() {
    if (this.activeSearch) {
      this.post("stop");
      this.activeSearch.reject(new Error("Search cancelled"));
      this.activeSearch = null;
    }
  }

  dispose() {
    this.stop();
    this.worker.terminate();
  }

  private async searchPosition({
    fen,
    moveTimeMs,
    multipv = 1,
    skillLevel = 10,
  }: SearchOptions): Promise<AnalysisResult> {
    await this.readyPromise;

    if (this.activeSearch) {
      this.stop();
    }

    return new Promise<AnalysisResult>((resolve, reject) => {
      const id = createSearchId();
      this.activeSearch = {
        id,
        resolve,
        reject,
        lines: new Map(),
        bestMove: null,
      };

      this.post("ucinewgame");
      this.post(`setoption name Skill Level value ${skillLevel}`);
      this.post(`setoption name MultiPV value ${multipv}`);
      this.post(`position fen ${fen}`);
      this.post(`go movetime ${moveTimeMs}`);
    });
  }

  private finishSearch(id: number) {
    if (!this.activeSearch || this.activeSearch.id !== id) {
      return;
    }

    const result: AnalysisResult = {
      bestMove: this.activeSearch.bestMove,
      lines: [...this.activeSearch.lines.values()].sort(
        (left, right) => left.multipv - right.multipv,
      ),
    };

    this.activeSearch.resolve(result);
    this.activeSearch = null;
  }

  private handleMessage(line: string) {
    if (line === "readyok") {
      this.resolveReady();
      return;
    }

    if (!this.activeSearch) {
      return;
    }

    const currentSearchId = this.activeSearch.id;

    if (line.startsWith("bestmove ")) {
      const rawMove = line.split(" ")[1];
      this.activeSearch.bestMove = rawMove ? parseMove(rawMove) : null;
      this.finishSearch(currentSearchId);
      return;
    }

    const infoLine = parseInfoLine(line);
    if (!infoLine) {
      return;
    }

    this.activeSearch.lines.set(infoLine.multipv, infoLine);
  }

  private post(command: string) {
    this.worker.postMessage(command);
  }
}

