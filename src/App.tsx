import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";

/* ========= Types ========= */
type Ref =
  | { kind: "static"; name: string }
  | { kind: "win"; gameId: string }
  | { kind: "lose"; gameId: string };

type Game = {
  id: string;     // GM1, GM2, ...
  day: string;    // FRI/SAT/SUN
  field: string;  // Carlington 1/2/3, Small, Large, Riverain, Sandy Hill
  time: string;   // 6:00pm, etc
  home: Ref;
  visitor: Ref;
};

type Result = { winner?: string };

// Resolves to the correct base (works locally and on GitHub Pages)
const asset = (p: string) => `${import.meta.env.BASE_URL}${p.replace(/^\/+/, "")}`;

/* ========= Teams (PNG logos) ========= */
type TeamMeta = { color: string; logo?: string };

const TEAM_META: Record<string, TeamMeta> = {
  "Aces of Bases":     { color: "#FFFFFF", logo: asset("logos/aces.png") },
  "Pitch Slap":        { color: "#C0C0C0", logo: asset("logos/pitch.png") },
  "Power Buff Girls":  { color: "#FF0000", logo: asset("logos/power.png") },
  "Backdoor Bangerz":  { color: "#000000", logo: asset("logos/bangerz.png") },
  "Gloria's Peacocks": { color: "#040585", logo: asset("logos/glorias.png") }, // <-- fixed key
  "Yankdeez":          { color: "#4CBB17", logo: asset("logos/yankdeez.png") },
  "No Glove No Love":  { color: "#0089B9", logo: asset("logos/noglove.png") },
  "Caught Looking":    { color: "#273C50", logo: asset("logos/caught.png") },
  "Peaches":           { color: "#FF10F0", logo: asset("logos/peaches.png") },
  "RBIs":              { color: "#4B9CD3", logo: asset("logos/rbis.png") },
  "Dingbats":          { color: "#7030A0", logo: asset("logos/dingbats.png") },
  "Master Batters":    { color: "#550000", logo: asset("logos/master.png") },
  "Queen Bees":        { color: "#FFD700", logo: asset("logos/queen.png") },
};
const DEFAULT_COLOR = "#334155";

/* ========= Helpers ========= */
const s = (name: string): Ref => ({ kind: "static", name });
const w = (gameId: string): Ref => ({ kind: "win", gameId });
const l = (gameId: string): Ref => ({ kind: "lose", gameId });

function teamMeta(name?: string): TeamMeta {
  if (!name) return { color: DEFAULT_COLOR };
  return TEAM_META[name] ?? { color: DEFAULT_COLOR };
}
function teamInitials(name?: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}
function contrastText(hex: string): "black" | "white" {
  const h = (hex || "#334155").replace("#", "");
  const r = parseInt(h.slice(0,2), 16) || 51;
  const g = parseInt(h.slice(2,4), 16) || 65;
  const b = parseInt(h.slice(4,6), 16) || 85;
  const yiq = (r*299 + g*587 + b*114) / 1000;
  return yiq >= 140 ? "black" : "white";
}

/* ========= Sharing helpers ========= */
function encodeState(obj: unknown): string {
  try {
    const json = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(json))); // UTF-8 safe
  } catch { return ""; }
}
function decodeState(s: string | null): any | null {
  if (!s) return null;
  try {
    const json = decodeURIComponent(escape(atob(s)));
    return JSON.parse(json);
  } catch { return null; }
}

/* ========= Winners Bracket (page 1) ========= */
const WIN_GAMES: Game[] = [
  { id: "GM1",  day: "FRI", field: "Carlington 2", time: "6:00pm",  home: s("Aces of Bases"),      visitor: s("Pitch Slap") },
  { id: "GM2",  day: "FRI", field: "Carlington 1", time: "6:00pm",  home: s("Backdoor Bangerz"),  visitor: s("Gloria's Peacocks") },
  { id: "GM3",  day: "FRI", field: "Small",        time: "6:00pm",  home: s("Yankdeez"),          visitor: s("No Glove No Love") },
  { id: "GM4",  day: "FRI", field: "Large",        time: "6:00pm",  home: s("Caught Looking"),    visitor: s("Peaches") },
  { id: "GM5",  day: "FRI", field: "Carlington 3", time: "6:00pm",  home: s("RBIs"),              visitor: s("Dingbats") },

  { id: "GM6",  day: "SAT", field: "Large",        time: "9:00am",  home: s("Power Buff Girls"),  visitor: w("GM1") },
  { id: "GM7",  day: "SAT", field: "Small",        time: "9:00am",  home: s("Master Batters"),    visitor: w("GM2") },
  { id: "GM8",  day: "SAT", field: "Small",        time: "10:45am", home: w("GM3"),               visitor: w("GM4") },
  { id: "GM9",  day: "SAT", field: "Large",        time: "10:45am", home: s("Queen Bees"),        visitor: w("GM5") },

  { id: "GM14", day: "SAT", field: "Riverain",     time: "2:15pm",  home: w("GM7"),               visitor: w("GM6") },
  { id: "GM15", day: "SAT", field: "Riverain",     time: "2:15pm",  home: w("GM9"),               visitor: w("GM8") },

  { id: "GM22", day: "SUN", field: "Riverain",     time: "12:30pm", home: w("GM15"),              visitor: w("GM14") },
  { id: "GM24", day: "SUN", field: "Riverain",     time: "4:00pm",  home: w("GM22"),              visitor: w("GM23") },
  { id: "GM25", day: "SUN", field: "Riverain",     time: "5:45pm*", home: w("GM24"),              visitor: l("GM24") },
];

/* ========= Losers Bracket (page 2) ========= */
const LOSE_GAMES: Game[] = [
  { id: "GM10", day: "SAT", field: "Sandy Hill", time: "10:45am", home: l("GM3"),   visitor: l("GM4") },
  { id: "GM11", day: "SAT", field: "Riverain",   time: "12:30pm", home: l("GM1"),   visitor: l("GM7") },
  { id: "GM12", day: "SAT", field: "Sandy Hill", time: "12:30pm", home: l("GM2"),   visitor: l("GM6") },
  { id: "GM13", day: "SAT", field: "Riverain",   time: "12:30pm", home: l("GM5"),   visitor: l("GM8") },

  { id: "GM16", day: "SAT", field: "Sandy Hill", time: "2:15pm",  home: w("GM10"),  visitor: l("GM9") },
  { id: "GM17", day: "SAT", field: "Riverain",   time: "4:00pm",  home: w("GM16"),  visitor: w("GM11") },
  { id: "GM18", day: "SAT", field: "Riverain",   time: "4:00pm",  home: w("GM12"),  visitor: w("GM13") },

  { id: "GM19", day: "SUN", field: "Riverain",   time: "10:45am", home: l("GM15"),  visitor: w("GM17") },
  { id: "GM20", day: "SUN", field: "Riverain",   time: "10:45am", home: l("GM14"),  visitor: w("GM18") },
  { id: "GM21", day: "SUN", field: "Riverain",   time: "10:45am", home: w("GM19"),  visitor: w("GM20") },

  { id: "GM23", day: "SUN", field: "Riverain",   time: "2:15pm",  home: l("GM22"),  visitor: w("GM21") },
];

/* ========= Storage ========= */
const STORAGE_KEY = "bracket_dual_pages_state_share_v1";

/* ========= Connectors ========= */
const WIN_CONNECT: Array<[string, string]> = [
  ["GM1",  "GM6"], ["GM2", "GM7"], ["GM3", "GM8"], ["GM4", "GM8"], ["GM5", "GM9"],
  ["GM6",  "GM14"], ["GM7", "GM14"], ["GM8", "GM15"], ["GM9", "GM15"],
  ["GM14","GM22"], ["GM15","GM22"], ["GM22","GM24"]
];

const LOSE_CONNECT: Array<[string, string]> = [
  ["GM10","GM16"], ["GM11","GM17"], ["GM12","GM18"], ["GM13","GM18"],
  ["GM16","GM17"], ["GM17","GM19"], ["GM18","GM20"],
  ["GM19","GM21"], ["GM20","GM21"], ["GM21","GM23"],
];

/* ========= Placements (fixed rows + visual offsets only) ========= */
type Place = { col: number; row: number; visualOffset?: number };
const ROW_H = 320; // px per row

const WIN_PLACEMENTS: Record<string, Place> = {
  // Column A
  GM1:  { col: 1, row: 1 },
  GM2:  { col: 1, row: 2 },
  GM3:  { col: 1, row: 3 },
  GM4:  { col: 1, row: 4 },
  GM5:  { col: 1, row: 5 },

  // Column B
  GM6:  { col: 2, row: 1 },
  GM7:  { col: 2, row: 2 },
  GM8:  { col: 2, row: 3, visualOffset: 140 },
  GM9:  { col: 2, row: 5 },

  // Column C
  GM14: { col: 3, row: 1, visualOffset: 200 },
  GM15: { col: 3, row: 4 },

  // Finals path
  GM22: { col: 4, row: 3 },
  GM24: { col: 5, row: 3 },
  GM25: { col: 5, row: 5 }, // IF game card location
};

const WIN_ORDER = ["GM1","GM6","GM14","GM22","GM24","GM25","GM2","GM3","GM4","GM5","GM7","GM8","GM9","GM15"];

const LOSE_PLACEMENTS: Record<string, Place> = {
  GM10: { col: 1, row: 1 },
  GM16: { col: 2, row: 2 },
  GM11: { col: 2, row: 3 },
  GM12: { col: 2, row: 4 },
  GM13: { col: 2, row: 5 },

  GM17: { col: 3, row: 2, visualOffset: 100 },
  GM18: { col: 3, row: 4, visualOffset: 140 },

  GM19: { col: 4, row: 2, visualOffset: 100 },
  GM20: { col: 4, row: 4, visualOffset: 140 },

  GM21: { col: 5, row: 3 },
  GM23: { col: 6, row: 3 },
};

const LOSE_ORDER = ["GM10","GM11","GM12","GM13","GM16","GM17","GM18","GM19","GM20","GM21","GM23"];

/* ========= App ========= */
export default function App() {
  // URL-first restore (then localStorage)
  const urlParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const urlState = decodeState(urlParams.get("s"));
  const urlTab = (urlParams.get("t") as "winners" | "losers" | "results" | null);

  const [results, setResults] = useState<Record<string, Result>>(() => {
    if (urlState && typeof urlState === "object") return urlState as Record<string, Result>;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  });

  const [tab, _setTab] = useState<"winners" | "losers" | "results">(urlTab ?? "winners");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  }, [results]);

  const setTabAndHash = (next: "winners" | "losers" | "results") => {
    _setTab(next);
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    params.set("t", next);
    const base = window.location.origin + window.location.pathname;
    window.history.replaceState(null, "", `${base}#${params.toString()}`);
  };

  const ALL_GAMES = useMemo(() => [...WIN_GAMES, ...LOSE_GAMES], []);

  // Resolve any Ref to a concrete team name (if known)
  const resolveName = (ref: Ref): string | undefined => {
    if (ref.kind === "static") return ref.name;
    if (ref.kind === "win") return results[ref.gameId]?.winner;
    // lose: figure out the team that did NOT win
    const g = ALL_GAMES.find(x => x.id === ref.gameId);
    if (!g) return undefined;
    const home = resolveName(g.home);
    const visitor = resolveName(g.visitor);
    const wname = results[ref.gameId]?.winner;
    if (!home || !visitor || !wname) return undefined;
    return wname === home ? visitor : wname === visitor ? home : undefined;
  };

  const derivedMap = useMemo(() => {
    const map: Record<string, { home?: string; visitor?: string }> = {};
    ALL_GAMES.forEach(g => {
      map[g.id] = {
        home: resolveName(g.home),
        visitor: resolveName(g.visitor),
      };
    });
    return map;
  }, [results]);

  const getWinner = (id: string) => results[id]?.winner;
  const getLoser = (id: string): string | undefined => {
    const g = ALL_GAMES.find(x => x.id === id);
    if (!g) return undefined;
    const home = resolveName(g.home);
    const visitor = resolveName(g.visitor);
    const w = results[id]?.winner;
    if (!home || !visitor || !w) return undefined;
    return w === home ? visitor : w === visitor ? home : undefined;
  };

  const setWinner = (id: string, team?: string) => {
    setResults(prev => ({ ...prev, [id]: { winner: team } }));
  };

  const copyShareLink = async () => {
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set("s", encodeState(results));
    params.set("t", tab);
    const shareUrl = `${base}#${params.toString()}`;
    await navigator.clipboard.writeText(shareUrl);
    alert("Share link copied!");
  };

  const reset = () => setResults({});

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a" }}>
      {/* Header + Tabs */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)",
        borderBottom: "1px solid #e2e8f0"
      }}>
        <div style={{ maxWidth: 2200, margin: "0 auto", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <img
              src={asset("logos/OQSL.png")}
              alt="OQSL"
              style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain" }}
            />
            <h1 style={{ fontSize: 20, fontWeight: 700, marginRight: 12 }}>2025 OQSL Playoffs</h1>
            <nav style={{ display: "flex", gap: 8 }}>
              <TabBtn active={tab==="winners"} onClick={()=>setTabAndHash("winners")}>Winners Bracket</TabBtn>
              <TabBtn active={tab==="losers"} onClick={()=>setTabAndHash("losers")}>Losers Bracket</TabBtn>
              <TabBtn active={tab==="results"} onClick={()=>setTabAndHash("results")}>Results</TabBtn>
            </nav>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                onClick={copyShareLink}
                style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #cbd5e1", color: "#0f172a", background: "white", cursor: "pointer" }}
              >
                Copy Share Link
              </button>
              <button
                onClick={reset}
                style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #fecdd3", color: "#be123c", background: "white", cursor: "pointer" }}
              >
                Reset Picks
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Pages */}
      {tab === "winners" ? (
        <BracketPage
          title="Winners Bracket"
          games={WIN_GAMES}
          placements={WIN_PLACEMENTS}
          order={WIN_ORDER}
          connectors={WIN_CONNECT}
          derived={derivedMap}
          results={results}
          onPick={setWinner}
          isIfGameActive={(id) => (id !== "GM25") || (!!getWinner("GM23") && !!getWinner("GM24") && getWinner("GM23") === getWinner("GM24"))}
        />
      ) : tab === "losers" ? (
        <BracketPage
          title="Losers Bracket"
          games={LOSE_GAMES}
          placements={LOSE_PLACEMENTS}
          order={LOSE_ORDER}
          connectors={LOSE_CONNECT}
          derived={derivedMap}
          results={results}
          onPick={setWinner}
          isIfGameActive={() => true}
        />
      ) : (
        <ResultsPage
          getWinner={getWinner}
          getLoser={getLoser}
        />
      )}
    </div>
  );
}

/* ========= BracketPage (grid + connectors) ========= */
function BracketPage(props: {
  title: string;
  games: Game[];
  placements: Record<string, { col: number; row: number; visualOffset?: number }>;
  order: string[];
  connectors: Array<[string, string]>;
  derived: Record<string, { home?: string; visitor?: string }>;
  results: Record<string, Result>;
  onPick: (id: string, team?: string) => void;
  isIfGameActive: (id: string) => boolean; // pass GM25 condition
}) {
  const { title, games, placements, order, connectors, derived, results, onPick, isIfGameActive } = props;

  const gridRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({ });
  const [svgSize, setSvgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [lines, setLines] = useState<Array<{ from: [number, number]; to: [number, number] }>>([]);

  // Dynamic column count
  const colCount = useMemo(
    () => Math.max(...Object.values(placements).map(p => p.col)),
    [placements]
  );

  const measure = () => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const newLines: Array<{ from: [number, number]; to: [number, number] }> = [];
    connectors.forEach(([a, b]) => {
      const fromEl = cardRefs.current[a];
      const toEl   = cardRefs.current[b];
      if (!fromEl || !toEl) return;
      const A = fromEl.getBoundingClientRect();
      const B = toEl.getBoundingClientRect();
      const from: [number, number] = [A.right - rect.left, A.top + A.height / 2 - rect.top];
      const to:   [number, number] = [B.left  - rect.left, B.top + B.height / 2 - rect.top];
      newLines.push({ from, to });
    });
    setLines(newLines);
    setSvgSize({ w: gridRef.current.scrollWidth, h: gridRef.current.scrollHeight });
  };

  useLayoutEffect(() => { measure(); }, [results, games]);
  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => measure());
    if (gridRef.current) ro.observe(gridRef.current);
    return () => { window.removeEventListener("resize", onResize); ro.disconnect(); };
  }, []);

  return (
    <main style={{ maxWidth: 2400, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div
        ref={gridRef}
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: new Array(colCount).fill("minmax(280px,1fr)").join(" "),
          gridAutoRows: `${ROW_H}px`,
          gap: 24,
          overflowX: "auto",
          paddingBottom: 24,
          background: "transparent",
        }}
      >
        {order.map(id => {
          const g = games.find(x => x.id === id);
          if (!g) return null;
          const pos = placements[id];
          const transform = pos.visualOffset ? `translateY(${pos.visualOffset}px)` : undefined;
          const d = derived[id] || {};
          const options = [d.home, d.visitor].filter(Boolean) as string[];
          let enablePicker = options.length > 0;

          // IF game rule: GM25 only pickable (and "active") when GM23 winner also wins GM24
          const active = isIfGameActive(id);
          if (id === "GM25") enablePicker = enablePicker && active;

          return (
            <div
              key={id}
              ref={(el) => { cardRefs.current[id] = el; }}
              style={{
                gridColumn: `${pos.col} / span 1`,
                gridRow: `${pos.row} / span 1`,
                transform,
                willChange: transform ? "transform" : undefined,
                opacity: id === "GM25" && !active ? 0.45 : 1,
              }}
            >
              <GameCard
                title={`Game ${id.replace("GM","")}${id==="GM25" ? " (IF NEEDED)" : ""}`}
                game={g}
                homeName={d.home ?? (g.home.kind === "win" ? `Winner ${g.home.gameId}` : g.home.kind === "lose" ? `Loser ${g.home.gameId}` : "TBD")}
                visitorName={d.visitor ?? (g.visitor.kind === "win" ? `Winner ${g.visitor.gameId}` : g.visitor.kind === "lose" ? `Loser ${g.visitor.gameId}` : "TBD")}
                selectedWinner={results[id]?.winner}
                onPick={(name) => { onPick(id, name || undefined); setTimeout(measure, 0); }}
                pickLabel={
                  id === "GM25"
                    ? "IF needed (GM23 must win GM24):"
                    : `Pick ${id} Winner:`
                }
                options={options}
                enablePicker={enablePicker}
              />
            </div>
          );
        })}

        {/* Connectors */}
        <svg
          width={svgSize.w}
          height={svgSize.h}
          style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }}
        >
          {lines.map((ln, i) => <Connector key={i} from={ln.from} to={ln.to} />)}
        </svg>
      </div>
    </main>
  );
}

/* ========= Results Page (center last two columns + bold note) ========= */
function ResultsPage(props: {
  getWinner: (id: string) => string | undefined;
  getLoser: (id: string) => string | undefined;
}) {
  const { getWinner, getLoser } = props;

  // Helper to prevent duplicates
  const seen = new Set<string>();
  const pushIf = (
    arr: Array<{
      team: string;
      tournamentLabel: string; // raw bracket outcome (ties allowed)
      finalRankNum?: number;   // 1..13
      finalRankLabel?: string; // "Champion!", "Silver!", "Bronze!", "4th"...
      game?: string;           // deciding/elim game for context
    }>,
    team?: string,
    tournamentLabel?: string,
    game?: string
  ) => {
    if (!team || !tournamentLabel) return;
    if (seen.has(team)) return;
    seen.add(team);
    arr.push({ team, tournamentLabel, game });
  };

  // Build tournament results with ties
  const rows: Array<{
    team: string;
    tournamentLabel: string;
    finalRankNum?: number;
    finalRankLabel?: string;
    game?: string;
  }> = [];

  // Bronze (3rd) & 4th
  const bronzeTeam = getLoser("GM23"); // 3rd
  const fourthTeam = getLoser("GM21"); // 4th
  if (bronzeTeam) pushIf(rows, bronzeTeam, "3rd", "GM23");
  if (fourthTeam) pushIf(rows, fourthTeam, "4th", "GM21");

  // 5th (tie): losers GM19, GM20
  const g5tie = [getLoser("GM19"), getLoser("GM20")].filter(Boolean) as string[];
  g5tie.forEach(t => pushIf(rows, t, "5th (tie)", t === getLoser("GM19") ? "GM19" : "GM20"));

  // 7th (tie): losers GM17, GM18
  const g7tie = [getLoser("GM17"), getLoser("GM18")].filter(Boolean) as string[];
  g7tie.forEach(t => pushIf(rows, t, "7th (tie)", t === getLoser("GM17") ? "GM17" : "GM18"));

  // 9th: loser GM16
  const ninth = getLoser("GM16");
  if (ninth) pushIf(rows, ninth, "9th", "GM16");

  // 10th (tie): losers GM10, GM11, GM12, GM13 (bottom four tied)
  const bottomFour = [getLoser("GM10"), getLoser("GM11"), getLoser("GM12"), getLoser("GM13")]
    .filter(Boolean) as string[];
  bottomFour.forEach(t =>
    pushIf(
      rows,
      t,
      "10th (tie)",
      t === getLoser("GM10") ? "GM10" :
      t === getLoser("GM11") ? "GM11" :
      t === getLoser("GM12") ? "GM12" : "GM13"
    )
  );

  // Champion / Silver from GM25 (if played) else GM24
  const w25 = getWinner("GM25");
  const l25 = w25 ? getLoser("GM25") : undefined;
  const w24 = !w25 ? getWinner("GM24") : undefined;

  // Regular-season seeds for tie-break
  const TEAM_SEED: Record<string, number> = {
    "Queen Bees": 1,
    "Master Batters": 2,
    "Power Buff Girls": 3,
    "Yankdeez": 4,
    "Caught Looking": 5,
    "Aces of Bases": 6,
    "Backdoor Bangerz": 7,
    "RBIs": 8,
    "Dingbats": 9,
    "Gloria'S Peacocks": 10,
    "Pitch Slap": 11,
    "Peaches": 12,
    "No Glove No Love": 13,
  };

  const byLabel: Record<string, string[]> = {};
  rows.forEach(r => { (byLabel[r.tournamentLabel] ??= []).push(r.team); });

  const rankWord = (n: number) => {
    if (n === 1) return "Champion!";
    if (n === 2) return "Silver!";
    if (n === 3) return "Bronze!";
    const suf = (n % 10 === 1 && n % 100 !== 11) ? "st"
            : (n % 10 === 2 && n % 100 !== 12) ? "nd"
            : (n % 10 === 3 && n % 100 !== 13) ? "rd"
            : "th";
    return `${n}${suf}`;
  };

  // Singles
  rows.forEach(r => {
    if (r.tournamentLabel === "3rd") { r.finalRankNum = 3; r.finalRankLabel = rankWord(3); }
    if (r.tournamentLabel === "4th") { r.finalRankNum = 4; r.finalRankLabel = rankWord(4); }
    if (r.tournamentLabel === "9th") { r.finalRankNum = 9; r.finalRankLabel = rankWord(9); }
  });

  // 5th tie -> 5th,6th
  if (byLabel["5th (tie)"]?.length) {
    const sorted = [...byLabel["5th (tie)"]].sort((a,b) => (TEAM_SEED[a] ?? 999) - (TEAM_SEED[b] ?? 999));
    const map: Record<string, number> = {};
    sorted.forEach((t, i) => { map[t] = 5 + i; });
    rows.forEach(r => {
      if (r.tournamentLabel === "5th (tie)") { const n = map[r.team]; r.finalRankNum = n; r.finalRankLabel = rankWord(n); }
    });
  }

  // 7th tie -> 7th,8th
  if (byLabel["7th (tie)"]?.length) {
    const sorted = [...byLabel["7th (tie)"]].sort((a,b) => (TEAM_SEED[a] ?? 999) - (TEAM_SEED[b] ?? 999));
    const map: Record<string, number> = {};
    sorted.forEach((t, i) => { map[t] = 7 + i; });
    rows.forEach(r => {
      if (r.tournamentLabel === "7th (tie)") { const n = map[r.team]; r.finalRankNum = n; r.finalRankLabel = rankWord(n); }
    });
  }

  // 10th tie -> 10th..13th
  if (byLabel["10th (tie)"]?.length) {
    const sorted = [...byLabel["10th (tie)"]].sort((a,b) => (TEAM_SEED[a] ?? 999) - (TEAM_SEED[b] ?? 999));
    const map: Record<string, number> = {};
    sorted.forEach((t, i) => { map[t] = 10 + i; });
    rows.forEach(r => {
      if (r.tournamentLabel === "10th (tie)") { const n = map[r.team]; r.finalRankNum = n; r.finalRankLabel = rankWord(n); }
    });
  }

  // Top rows
  const topRows: Array<{ team: string; tournamentLabel: string; finalRankNum: number; finalRankLabel: string; game?: string }> = [];
  if (w25 && l25) {
    topRows.push({ team: w25, tournamentLabel: "1st", finalRankNum: 1, finalRankLabel: rankWord(1) });
    topRows.push({ team: l25, tournamentLabel: "2nd", finalRankNum: 2, finalRankLabel: rankWord(2), game: "GM25" });
  } else if (w24) {
    const l = getLoser("GM24");
    if (w24) topRows.push({ team: w24, tournamentLabel: "1st", finalRankNum: 1, finalRankLabel: rankWord(1) });
    if (l)   topRows.push({ team: l,   tournamentLabel: "2nd", finalRankNum: 2, finalRankLabel: rankWord(2), game: "GM24" });
  }

  const allRows = [...topRows, ...rows].filter(r => !!r.team);
  allRows.sort((a, b) => (a.finalRankNum ?? 999) - (b.finalRankNum ?? 999));

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>Results / Final Rankings</div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "white" }}>
        {/* Header row: 4 columns (center the last two) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "200px 1fr 160px 220px",
            background: "#f1f5f9",
            padding: "10px 12px",
            fontWeight: 700
          }}
        >
          <div>Tournament Results</div>
          <div>Team</div>
          <div style={{ textAlign: "center" }}>Eliminated In:</div>
          <div style={{ textAlign: "center" }}>Final Playoff Ranking</div>
        </div>

        {allRows.map((r, idx) => {
          const eliminated = r.finalRankNum === 1 ? "" : (r.game ?? "");
          return (
            <ResultRow
              key={`rank-${r.team}-${idx}`}
              tournamentLabel={r.tournamentLabel}
              team={r.team}
              eliminated={eliminated}
              finalLabel={r.finalRankLabel ?? "—"}
            />
          );
        })}
      </div>

      <p style={{ marginTop: 8, fontSize: 12, color: "#000", fontWeight: 700 }}>
        All ties are broken by regular season final standings.
      </p>
    </main>
  );
}

function ResultRow(props: {
  tournamentLabel: string;
  team: string;
  eliminated: string; // "" for champion
  finalLabel: string;
}) {
  const { tournamentLabel, team, eliminated, finalLabel } = props;
  const meta = teamMeta(team);
  const text = contrastText(meta.color);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr 160px 220px",
        alignItems: "center",
        padding: "10px 12px",
        borderTop: "1px solid #e2e8f0"
      }}
    >
      <div style={{ fontWeight: 700 }}>{tournamentLabel}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", border: `1px solid ${meta.color}`, flexShrink: 0 }}>
          {meta.logo
            ? <img src={meta.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, background: meta.color, color: text }}>
                {teamInitials(team)}
              </div>
          }
        </div>
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team}</span>
      </div>

      <div style={{ textAlign: "center", fontVariantNumeric: "tabular-nums", color: "#334155" }}>
        {eliminated || ""}
      </div>

      <div style={{ textAlign: "center", fontWeight: 700 }}>
        {finalLabel}
      </div>
    </div>
  );
}
/* ========= Connector Path ========= */
function Connector({ from, to }: { from: [number, number]; to: [number, number] }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = Math.max(24, (x2 - x1) / 2);
  const c1x = x1 + dx, c1y = y1;
  const c2x = x2 - dx, c2y = y2;
  return (
    <path
      d={`M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`}
      fill="none"
      stroke="#94a3b8"
      strokeWidth={2}
      strokeOpacity={0.9}
    />
  );
}

/* ========= UI ========= */
function GameCard(props: {
  title: string;
  game: Game;
  homeName?: string;
  visitorName?: string;
  selectedWinner?: string;
  onPick: (team: string) => void;
  pickLabel?: string;
  options?: string[];
  enablePicker?: boolean;
}) {
  const {
    title, game, homeName, visitorName,
    selectedWinner, onPick, pickLabel = "Pick Winner:",
    options = [], enablePicker = true
  } = props;
  const homeMeta = teamMeta(homeName);
  const visMeta  = teamMeta(visitorName);
  const showPicker = enablePicker && options.length > 0;

  return (
    <div style={{ borderRadius: 16, border: "1px solid #e2e8f0", background: "white", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${homeMeta.color} 0%, ${visMeta.color} 100%)` }} />
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>

        {/* INFO (single-line, no-wrap) */}
        <div
          style={{
            marginTop: 4,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: 16,
            rowGap: 4,
            fontSize: 14,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ fontWeight: 600 }}>Match:</span> {game.id}
          </div>
          <div style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ fontWeight: 600 }}>Date:</span> {game.day}
          </div>
          <div style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ fontWeight: 600 }}>Field:</span> {game.field}
          </div>
          <div style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ fontWeight: 600 }}>Time:</span> {game.time}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", rowGap: 8 }}>
          <TeamRow label="Home" name={homeName} />
          <TeamRow label="Visitor" name={visitorName} />
        </div>

        {showPicker && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label style={{ fontSize: 14, minWidth: 150 }}>{pickLabel}</label>
            <select
              value={selectedWinner ?? ""}
              onChange={(e) => onPick(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "white",
                fontSize: 14
              }}
            >
              <option value="">— Select —</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {selectedWinner && (
              <span style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #86efac",
                background: "#ecfdf5",
                color: "#047857"
              }}>
                Winner: {selectedWinner}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamRow(props: { label: string; name?: string }) {
  const { label, name = "TBD" } = props;
  const meta = teamMeta(name);
  const bg = { backgroundColor: meta.color, color: contrastText(meta.color) };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, border: "1px solid #e2e8f0", background: "white" }}>{label}</span>
      <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: `1px solid ${meta.color}`, flexShrink: 0 }}>
        {meta.logo ? (
          <img src={meta.logo} alt="" aria-label={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, ...bg }}>
            {teamInitials(name)}
          </div>
        )}
      </div>
      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
    </div>
  );
}

function TabBtn(props: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  const { active, onClick, children } = props;
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: active ? "1px solid #0ea5e9" : "1px solid #e2e8f0",
        background: active ? "#e0f2fe" : "white",
        color: active ? "#0369a1" : "#334155",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}





