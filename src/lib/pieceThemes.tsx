import type { CSSProperties, JSX } from "react";

export type PieceThemeName = "royal" | "vintage" | "midnight";
export type PieceRenderers = Record<
  string,
  (props?: {
    fill?: string;
    square?: string;
    svgStyle?: CSSProperties;
  }) => JSX.Element
>;

type PiecePalette = {
  lightMain: string;
  lightAccent: string;
  lightStroke: string;
  darkMain: string;
  darkAccent: string;
  darkStroke: string;
};

const PIECE_PALETTES: Record<PieceThemeName, PiecePalette> = {
  royal: {
    lightMain: "#ffffff",
    lightAccent: "#d9dee8",
    lightStroke: "#8b96a7",
    darkMain: "#1c2533",
    darkAccent: "#536275",
    darkStroke: "#edf2fb",
  },
  vintage: {
    lightMain: "#fff8ea",
    lightAccent: "#d9c6a1",
    lightStroke: "#7d6848",
    darkMain: "#4b2f1f",
    darkAccent: "#7f5b3d",
    darkStroke: "#f4e8ce",
  },
  midnight: {
    lightMain: "#f7fbff",
    lightAccent: "#c0d4f8",
    lightStroke: "#5b78a2",
    darkMain: "#0f172a",
    darkAccent: "#37557f",
    darkStroke: "#e0edff",
  },
};

const pieceStyle = (
  fill: string,
  stroke: string,
  shadow: string,
): CSSProperties => ({
  fill,
  stroke,
  strokeWidth: 4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  filter: `drop-shadow(0 8px 10px ${shadow})`,
});

const accentStyle = (
  fill: string,
  stroke: string,
  shadow: string,
): CSSProperties => ({
  fill,
  stroke,
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  filter: `drop-shadow(0 8px 10px ${shadow})`,
});

const baseSvgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

type PieceSvgProps = {
  color: "light" | "dark";
  theme: PieceThemeName;
  svgStyle?: CSSProperties;
};

const useStyles = (color: "light" | "dark", theme: PieceThemeName) => {
  const palette = PIECE_PALETTES[theme];
  const shadow =
    color === "light" ? "rgba(15, 23, 42, 0.22)" : "rgba(15, 23, 42, 0.34)";

  return {
    main: pieceStyle(
      color === "light" ? palette.lightMain : palette.darkMain,
      color === "light" ? palette.lightStroke : palette.darkStroke,
      shadow,
    ),
    trim: accentStyle(
      color === "light" ? palette.lightAccent : palette.darkAccent,
      color === "light" ? palette.lightStroke : palette.darkStroke,
      shadow,
    ),
  };
};

const Pawn = ({ color, theme, svgStyle }: PieceSvgProps) => {
  const { main, trim } = useStyles(color, theme);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ ...baseSvgStyle, ...svgStyle }}>
      <circle cx="50" cy="26" r="12" style={main} />
      <path d="M39 43c1-8 7-12 11-12s10 4 11 12l3 8c8 6 13 16 13 28H23c0-12 5-22 13-28z" style={main} />
      <rect x="30" y="76" width="40" height="9" rx="4" style={trim} />
    </svg>
  );
};

const Rook = ({ color, theme, svgStyle }: PieceSvgProps) => {
  const { main, trim } = useStyles(color, theme);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ ...baseSvgStyle, ...svgStyle }}>
      <path d="M28 22h10v10H28zm17 0h10v10H45zm17 0h10v10H62z" style={trim} />
      <path d="M31 31h38l-4 15H35zm4 15h30l4 26H31zm-2 26h34l4 10H29z" style={main} />
      <rect x="26" y="82" width="48" height="8" rx="4" style={trim} />
    </svg>
  );
};

const Knight = ({ color, theme, svgStyle }: PieceSvgProps) => {
  const { main, trim } = useStyles(color, theme);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ ...baseSvgStyle, ...svgStyle }}>
      <path d="M34 80c0-13 7-24 16-31l9-8-2-10c9 0 18 5 21 13-5-1-10 0-15 2l-5 8c11 3 18 14 18 26v1H34z" style={main} />
      <path d="M49 28c5-10 16-15 26-13-3 3-4 7-4 10 5 1 9 3 12 7-8-1-16 1-22 6l-7 6" style={main} />
      <path d="M48 42c4-5 8-8 14-11" style={trim} />
      <circle cx="60" cy="34" r="2.8" style={trim} />
      <path d="M59 49c5 2 9 6 12 10" style={trim} />
      <path d="M42 83h35" style={trim} />
    </svg>
  );
};

const Bishop = ({ color, theme, svgStyle }: PieceSvgProps) => {
  const { main, trim } = useStyles(color, theme);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ ...baseSvgStyle, ...svgStyle }}>
      <path d="M50 14c8 0 14 7 14 15 0 6-3 10-7 14l7 9c6 8 9 17 9 28H27c0-11 3-20 9-28l7-9c-4-4-7-8-7-14 0-8 6-15 14-15z" style={main} />
      <path d="M59 19 41 45" style={trim} />
      <path d="M50 17c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z" style={trim} />
      <path d="M43 34c2 2 4 3 7 3s5-1 7-3" style={trim} />
      <path d="M39 61h22" style={trim} />
      <rect x="30" y="79" width="40" height="8" rx="4" style={trim} />
    </svg>
  );
};

const Queen = ({ color, theme, svgStyle }: PieceSvgProps) => {
  const { main, trim } = useStyles(color, theme);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ ...baseSvgStyle, ...svgStyle }}>
      <circle cx="20" cy="26" r="5" style={trim} />
      <circle cx="35" cy="18" r="5" style={trim} />
      <circle cx="50" cy="12" r="5" style={trim} />
      <circle cx="65" cy="18" r="5" style={trim} />
      <circle cx="80" cy="26" r="5" style={trim} />
      <path d="M20 31 29 56h42l9-25-13 7-17-18-17 18z" style={main} />
      <path d="M29 56h42l5 16H24z" style={main} />
      <path d="M31 42h38M36 49h28" style={trim} />
      <rect x="23" y="79" width="54" height="8" rx="4" style={trim} />
    </svg>
  );
};

const King = ({ color, theme, svgStyle }: PieceSvgProps) => {
  const { main, trim } = useStyles(color, theme);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ ...baseSvgStyle, ...svgStyle }}>
      <path d="M50 8v19M40 18h20" style={trim} />
      <path d="M39 30c0-7 5-11 11-11s11 4 11 11c0 5-2 9-5 12l6 10c6 8 9 16 9 27H29c0-11 3-19 9-27l6-10c-3-3-5-7-5-12z" style={main} />
      <path d="M34 55h32M37 65h26M40 73h20" style={trim} />
      <rect x="27" y="79" width="46" height="8" rx="4" style={trim} />
    </svg>
  );
};

const createThemePieces = (theme: PieceThemeName): PieceRenderers => ({
  wP: (props) => <Pawn color="light" theme={theme} svgStyle={props?.svgStyle} />,
  wR: (props) => <Rook color="light" theme={theme} svgStyle={props?.svgStyle} />,
  wN: (props) => <Knight color="light" theme={theme} svgStyle={props?.svgStyle} />,
  wB: (props) => <Bishop color="light" theme={theme} svgStyle={props?.svgStyle} />,
  wQ: (props) => <Queen color="light" theme={theme} svgStyle={props?.svgStyle} />,
  wK: (props) => <King color="light" theme={theme} svgStyle={props?.svgStyle} />,
  bP: (props) => <Pawn color="dark" theme={theme} svgStyle={props?.svgStyle} />,
  bR: (props) => <Rook color="dark" theme={theme} svgStyle={props?.svgStyle} />,
  bN: (props) => <Knight color="dark" theme={theme} svgStyle={props?.svgStyle} />,
  bB: (props) => <Bishop color="dark" theme={theme} svgStyle={props?.svgStyle} />,
  bQ: (props) => <Queen color="dark" theme={theme} svgStyle={props?.svgStyle} />,
  bK: (props) => <King color="dark" theme={theme} svgStyle={props?.svgStyle} />,
});

const PIECE_THEME_CACHE: Record<PieceThemeName, PieceRenderers> = {
  royal: createThemePieces("royal"),
  vintage: createThemePieces("vintage"),
  midnight: createThemePieces("midnight"),
};

export const getPieceRenderers = (theme: PieceThemeName): PieceRenderers =>
  PIECE_THEME_CACHE[theme];

