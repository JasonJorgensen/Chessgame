import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChessGame } from "./ChessGame";

const CHECKMATE_FEN = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";

const parseFenPieces = (fen: string) => {
  const [boardFen] = fen.split(" ");
  const ranks = boardFen.split("/");
  const pieces = new Map<string, string>();

  ranks.forEach((rank, rankIndex) => {
    let file = 0;
    for (const char of rank) {
      if (/\d/.test(char)) {
        file += Number(char);
        continue;
      }

      const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
      const square = `${fileChar}${8 - rankIndex}`;
      pieces.set(square, char);
      file += 1;
    }
  });

  return pieces;
};

vi.mock("./Board", () => ({
  Board: ({
    fen,
    onSquareClick,
  }: {
    fen: string;
    onSquareClick: (square: string) => void;
  }) => {
    const pieces = parseFenPieces(fen);
    const squares = ["e2", "e4", "d2", "d4", "h4"];

    return (
      <div>
        {squares.map((square) => (
          <button
            key={square}
            type="button"
            aria-label={square}
            data-piece={pieces.get(square) ?? ""}
            onClick={() => onSquareClick(square)}
          >
            {square}
          </button>
        ))}
      </div>
    );
  },
}));

describe("ChessGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("applies an AI reply after a legal human move", () => {
    render(<ChessGame aiDelayMs={250} aiStrategy="simple" />);

    fireEvent.click(screen.getByLabelText("e2"));
    fireEvent.click(screen.getByLabelText("e4"));

    expect(screen.getByText("Black to move.")).toBeInTheDocument();
    expect(screen.getByText("Computer is thinking…")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByText("Computer is thinking…")).not.toBeInTheDocument();
    expect(screen.getByText("White to move.")).toBeInTheDocument();
  });

  it("cancels a pending AI move when the game is reset", () => {
    render(<ChessGame aiDelayMs={250} aiStrategy="simple" />);

    fireEvent.click(screen.getByLabelText("e2"));
    fireEvent.click(screen.getByLabelText("e4"));

    fireEvent.click(screen.getByRole("button", { name: "New Game" }));

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByText("Computer is thinking…")).not.toBeInTheDocument();
    expect(screen.getByText("White to move.")).toBeInTheDocument();
    expect(screen.getByLabelText("e2")).toHaveAttribute("data-piece", "P");
    expect(screen.getByLabelText("e4")).toHaveAttribute("data-piece", "");
  });

  it("blocks interactions after the game is over", () => {
    render(<ChessGame initialFen={CHECKMATE_FEN} aiStrategy="simple" />);

    expect(screen.getByText("Checkmate · Black wins")).toBeInTheDocument();

    const e2 = screen.getByLabelText("e2");
    fireEvent.click(e2);

    expect(e2).not.toHaveClass("selected");
    expect(screen.queryByText("Computer is thinking…")).not.toBeInTheDocument();
    expect(screen.getByText("Checkmate · Black wins")).toBeInTheDocument();
  });

  it("lets the player choose black and waits for the AI opening move", () => {
    render(<ChessGame aiDelayMs={250} aiStrategy="simple" playerColor="b" />);

    expect(screen.getByText(/You are playing as/i)).toHaveTextContent("Black");
    expect(screen.getByText("Computer is thinking…")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByText("Computer is thinking…")).not.toBeInTheDocument();
    expect(screen.getByText("Black to move.")).toBeInTheDocument();
  });
});

