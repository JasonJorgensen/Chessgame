import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChessGame } from "./ChessGame";

const CHECKMATE_FEN = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";

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
    render(<ChessGame aiDelayMs={250} />);

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
    render(<ChessGame aiDelayMs={250} />);

    fireEvent.click(screen.getByLabelText("e2"));
    fireEvent.click(screen.getByLabelText("e4"));

    fireEvent.click(screen.getByRole("button", { name: "New Game" }));

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByText("Computer is thinking…")).not.toBeInTheDocument();
    expect(screen.getByText("White to move.")).toBeInTheDocument();
    expect(screen.getByLabelText("e2")).toHaveTextContent("♙");
    expect(screen.getByLabelText("e4")).not.toHaveTextContent(/\S/);
  });

  it("blocks interactions after the game is over", () => {
    render(<ChessGame initialFen={CHECKMATE_FEN} />);

    expect(screen.getByText("Checkmate · Black wins")).toBeInTheDocument();

    const e2 = screen.getByLabelText("e2");
    fireEvent.click(e2);

    expect(e2).not.toHaveClass("selected");
    expect(screen.queryByText("Computer is thinking…")).not.toBeInTheDocument();
    expect(screen.getByText("Checkmate · Black wins")).toBeInTheDocument();
  });
});

