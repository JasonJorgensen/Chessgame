import type { AnalysisResult } from "../lib/analysis.runtime";
import type { StylePreset } from "../lib/stylePresets";
import { AnalysisPreviewBoard } from "./AnalysisPreviewBoard";

type AnalysisPanelProps = {
  analysis: AnalysisResult | null;
  enabled: boolean;
  loading: boolean;
  currentFen: string;
  stylePreset: StylePreset;
  orientation: "white" | "black";
};

const prettyMove = (move: string | undefined) => {
  if (!move) return "n/a";
  return move.length > 4
    ? `${move.slice(0, 2)}-${move.slice(2, 4)}=${move.slice(4).toUpperCase()}`
    : `${move.slice(0, 2)}-${move.slice(2, 4)}`;
};

export function AnalysisPanel({
  analysis,
  enabled,
  loading,
  currentFen,
  stylePreset,
  orientation,
}: AnalysisPanelProps) {
  if (!enabled) {
    return (
      <div className="analysis-card">
        <h3>Analysis</h3>
        <p>Turn analysis on to see the engine&apos;s best move and top lines.</p>
      </div>
    );
  }

  return (
    <div className="analysis-card">
      <div className="analysis-header">
        <h3>Analysis</h3>
        {loading && <span className="analysis-badge">Thinking…</span>}
      </div>

      {analysis?.bestMove ? (
        <div className="analysis-best-move analysis-hover-target" tabIndex={0}>
          <span className="analysis-label">Best move</span>
          <strong>{prettyMove(`${analysis.bestMove.from}${analysis.bestMove.to}${analysis.bestMove.promotion ?? ""}`)}</strong>
          <AnalysisPreviewBoard
            baseFen={currentFen}
            moves={[
              `${analysis.bestMove.from}${analysis.bestMove.to}${analysis.bestMove.promotion ?? ""}`,
            ]}
            stylePreset={stylePreset}
            orientation={orientation}
          />
        </div>
      ) : (
        <p className="analysis-empty">
          {loading ? "Looking for the strongest continuation…" : "No engine line available yet."}
        </p>
      )}

      {analysis?.lines?.length ? (
        <ol className="analysis-lines">
          {analysis.lines.map((line) => (
            <li
              key={`${line.multipv}-${line.pv.join("-")}`}
              className="analysis-line-item analysis-hover-target"
              tabIndex={0}
            >
              <div className="analysis-line-top">
                <span>Line {line.multipv}</span>
                <span>Depth {line.depth}</span>
                <strong>{line.evaluation}</strong>
              </div>
              <p>{line.pv.slice(0, 6).map(prettyMove).join(" ")}</p>
              <AnalysisPreviewBoard
                baseFen={currentFen}
                moves={line.pv}
                stylePreset={stylePreset}
                orientation={orientation}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

