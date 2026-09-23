import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { DifficultyProfile, Board, Match } from "./src/game/types";
import { getDifficultyProfile } from "./src/game/difficulty";
import { generateInitialBoard } from "./src/game/generator";
import { addDeterministicRow } from "./src/game/addRowEngine";
import { countCells, ensureBoardPlayable, findMatches, removeMatch } from "./src/game/matchEngine";

const { width } = Dimensions.get("window");
const BOARD_WIDTH = Math.min(width - 28, 900);
const CELL = Math.floor((BOARD_WIDTH - 28) / 9);

const candyColors = [
  "#ff4d9d", "#ffb800", "#2ec4ff", "#7bd389", "#ff7b54",
  "#8d6af9", "#fdca40", "#ff5ec4", "#00c2a8"
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function NumberTile({
  value,
  selected,
  hint,
  onPress
}: {
  value: number | null;
  selected: boolean;
  hint: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      tension: 180,
      friction: 8,
      useNativeDriver: true
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 180,
      friction: 8,
      useNativeDriver: true
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={value === null}
      style={styles.tilePressable}
    >
      <Animated.View
        style={[
          styles.tile,
          { width: CELL, height: CELL },
          value === null && styles.emptyTile,
          value !== null && { backgroundColor: candyColors[(value - 1) % candyColors.length] },
          selected && styles.selectedTile,
          hint && styles.hintTile,
          { transform: [{ scale }] }
        ]}
      >
        {value !== null && (
          <>
            <View style={styles.gloss} />
            <View style={styles.sparkle} />
            <Text style={styles.tileText}>{value}</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

function MoodCharacter({ mood, compact = false }: { mood: "happy" | "sad" | "idle"; compact?: boolean }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(bounce, {
      toValue: mood === "happy" ? 1 : 0,
      tension: 200,
      friction: 7,
      useNativeDriver: true
    }).start();
  }, [bounce, mood]);

  const mouthStyle = mood === "happy"
    ? styles.happyMouth
    : mood === "sad"
      ? styles.sadMouth
      : styles.idleMouth;

  return (
    <Animated.View style={[compact ? styles.compactCharacterWrap : styles.characterWrap, { transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, compact ? -4 : -8] }) }] }]}> 
      <View style={[styles.characterBubble, compact && styles.compactCharacterBubble]}>
        <View style={[styles.face, compact && styles.compactFace]}>
          <View style={[styles.eyeRow, compact && styles.compactEyeRow]}>
            <View style={[styles.eye, compact && styles.compactEye]} />
            <View style={[styles.eye, compact && styles.compactEye]} />
          </View>
          <View style={[mouthStyle, compact && styles.compactMouth]} />
          <View style={styles.cheekLeft} />
          <View style={styles.cheekRight} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function App() {
  const [level, setLevel] = useState(1);
  const profile: DifficultyProfile = useMemo(() => getDifficultyProfile(level), [level]);
  const targetMatches = useMemo(() => 52 + (level - 1) * 8, [level]);
  const [board, setBoard] = useState<Board>(() => generateInitialBoard(1, profile));
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [matches, setMatches] = useState(0);
  const [adds, setAdds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [unhelpfulAdds, setUnhelpfulAdds] = useState(0);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [boardCleared, setBoardCleared] = useState(false);
  const [hint, setHint] = useState<Array<{ row: number; col: number }>>([]);
  const [mood, setMood] = useState<"happy" | "sad" | "idle">("idle");
  const [lastEvent, setLastEvent] = useState("Find a pair.");

  useEffect(() => {
    if (!started || complete) return;
    const id = setInterval(() => setElapsed(v => v + 1), 1000);
    return () => clearInterval(id);
  }, [started, complete]);

  useEffect(() => {
    if (!started || complete) return;
    if (elapsed >= profile.targetSeconds) {
      setMood("sad");
    }
  }, [elapsed, started, complete, profile.targetSeconds]);

  useEffect(() => {
    if (countCells(board) === 0 && started) {
      setBoardCleared(true);
      setComplete(true);
      setSelected(null);
      setLastEvent("Board cleared! Level complete.");
    } else if (countCells(board) > 0) {
      setBoardCleared(false);
    }
  }, [board, started, complete]);

  function restart(nextLevel = level) {
    const p = getDifficultyProfile(nextLevel);
    setLevel(nextLevel);
    setBoard(generateInitialBoard(nextLevel, p));
    setSelected(null);
    setHint([]);
    setMatches(0);
    setAdds(0);
    setElapsed(0);
    setUnhelpfulAdds(0);
    setStarted(false);
    setComplete(false);
    setBoardCleared(false);
    setMood("idle");
    setLastEvent("Tap a candy to start.");
  }

  function showHint() {
    if (complete || countCells(board) === 0) return;

    const legal = findMatches(board);
    const match = legal[0];
    if (!match) {
      setHint([]);
      setLastEvent("No legal moves found on the board.");
      return;
    }

    const cells = [match.a, match.b];
    setHint(cells);
    setSelected(null);
    setLastEvent(match.kind === "same" ? "Hint: equal numbers are legal." : "Hint: these add to 10.");
  }

  function handleTilePress(row: number, col: number) {
    if (complete) return;
    if (!started) setStarted(true);
    if (board[row] === undefined || board[row][col] === null) return;

    setHint([]);

    if (!selected) {
      setSelected({ row, col });
      return;
    }

    if (selected.row === row && selected.col === col) {
      setSelected(null);
      return;
    }

    const legal = findMatches(board);
    const match = legal.find(m =>
      (m.a.row === selected.row && m.a.col === selected.col && m.b.row === row && m.b.col === col) ||
      (m.b.row === selected.row && m.b.col === selected.col && m.a.row === row && m.a.col === col)
    );

    if (match) {
      const nextBoard = removeMatch(board, match);
      if (countCells(nextBoard) === 0) {
        setBoard([]);
      } else {
        const stabilized = ensureBoardPlayable(nextBoard);
        setBoard(stabilized);
      }
      setMatches(v => v + 1);
      setMood("happy");
      setLastEvent(match.kind === "same" ? "Same-number match!" : "Sum-to-10 match!");
    } else {
      setMood("sad");
      setLastEvent("That pair does not match.");
    }
    setSelected(null);
  }

  function addRow() {
    if (adds >= 6 || complete || countCells(board) === 0) return;
    if (!started) setStarted(true);
    setHint([]);

    const result = addDeterministicRow(board, profile, level, adds, unhelpfulAdds);
    const stabilized = ensureBoardPlayable(result.board.length ? result.board : board);
    setBoard(stabilized);
    setAdds(v => v + 1);

    if (result.rescued) {
      setLastEvent("RESCUE: an instant match was planted.");
      setUnhelpfulAdds(0);
    } else if (result.stragglerHelped) {
      setLastEvent("Straggler cleanup: an isolated cell was targeted.");
      setUnhelpfulAdds(0);
    } else {
      setLastEvent("Controlled row added.");
      setUnhelpfulAdds(v => v + 1);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable style={styles.circleButton} onPress={() => restart(level)}>
            <Text style={styles.circleText}>‹</Text>
          </Pressable>
          <View style={styles.levelBadge}>
            <Text style={styles.badgeSmall}>LEVEL</Text>
            <Text style={styles.badgeBig}>{level}</Text>
          </View>
          <View style={styles.headerCharacter}>
            <MoodCharacter mood={mood} compact />
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.timeBadge}>
            <Text style={styles.badgeSmall}>MATCHES LEFT</Text>
            <Text style={styles.timeText}>{Math.max(targetMatches - matches, 0)}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="ADD ROWS" value={`${6 - adds}/6`} color="#ffa31c" />
          <Stat label="MATCHES" value={matches} color="#55dd72" />
          <Stat label="CELLS" value={countCells(board)} color="#12a9e8" />
        </View>

        <View style={styles.boardShell}>
          {board.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((value, c) => (
                <NumberTile
                  key={`${r}-${c}`}
                  value={value}
                  selected={selected?.row === r && selected?.col === c}
                  hint={hint.some(pos => pos.row === r && pos.col === c)}
                  onPress={() => handleTilePress(r, c)}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.addButton, adds >= 6 && styles.disabled]}
            onPress={addRow}
            disabled={adds >= 6 || complete}
          >
            <Text style={styles.addText}>＋ ADD ROW</Text>
            <Text style={styles.addCount}>{6 - adds}</Text>
          </Pressable>

          <Pressable style={styles.hintButton} onPress={showHint} disabled={complete || countCells(board) === 0}>
            <Text style={styles.hintButtonText}>💡 HINT</Text>
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Pressable style={styles.restartButton} onPress={() => restart(level)}>
            <Text style={styles.bottomText}>↻ RESTART</Text>
          </Pressable>
          <Pressable
            style={[styles.lockedButton, !boardCleared && styles.disabled]}
            onPress={() => {
              if (boardCleared) restart(level + 1);
            }}
            disabled={!boardCleared}
          >
            <Text style={styles.bottomText}>{boardCleared ? "🔓 NEXT LEVEL" : "🔒 NEXT LEVEL"}</Text>
          </Pressable>
        </View>

      </ScrollView>

      {complete && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTop}>LEVEL COMPLETE</Text>
            <Text style={styles.modalTitle}>LEVEL {level}</Text>
            <Text style={styles.modalBody}>
              Cleared in {formatTime(elapsed)} with {adds} Add Row use{adds === 1 ? "" : "s"}.
            </Text>
            <Pressable
              style={styles.nextButton}
              onPress={() => restart(level + 1)}
            >
              <Text style={styles.nextText}>▶ NEXT LEVEL</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!started && !complete && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTop}>READY?</Text>
            <Text style={styles.modalTitle}>LEVEL {level}</Text>
            <Text style={styles.modalBody}>
              Match equal digits or pairs summing to 10. Empty cells do not block a line.
            </Text>
            <Pressable style={styles.nextButton} onPress={() => setStarted(true)}>
              <Text style={styles.nextText}>▶ START</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1f1233" },
  container: { alignItems: "center", padding: 14, paddingBottom: 40, backgroundColor: "#1f1233" },
  topBar: { width: "100%", maxWidth: 900, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, position: "relative" },
  headerCharacter: { position: "absolute", left: "50%", marginLeft: -33, top: 0, width: 66, height: 58, alignItems: "center", justifyContent: "center", zIndex: 2 },
  circleButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#7fa5dc", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#e7f0ff" },
  circleText: { color: "white", fontSize: 38, lineHeight: 40, fontWeight: "900" },
  levelBadge: { backgroundColor: "#9b52ee", borderRadius: 26, paddingHorizontal: 18, paddingVertical: 6, alignItems: "center", borderWidth: 3, borderColor: "#efcfff" },
  badgeSmall: { color: "white", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  badgeBig: { color: "white", fontSize: 24, fontWeight: "900" },
  timeBadge: { backgroundColor: "#ff5d2b", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 6, alignItems: "center", borderWidth: 3, borderColor: "#ffd4bd" },
  timeText: { color: "white", fontSize: 22, fontWeight: "900" },
  statsRow: { width: "100%", maxWidth: 900, flexDirection: "row", gap: 8, marginBottom: 14 },
  stat: { flex: 1, minHeight: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.75)" },
  statLabel: { color: "white", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  statValue: { color: "white", fontSize: 21, fontWeight: "900" },
  boardShell: { width: BOARD_WIDTH, backgroundColor: "rgba(72, 30, 85, 0.88)", borderRadius: 30, padding: 12, borderWidth: 4, borderColor: "rgba(255, 216, 120, 0.95)", shadowColor: "#ffb703", shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  row: { flexDirection: "row", justifyContent: "center" },
  tilePressable: { margin: 2 },
  tile: { borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.8)", shadowColor: "#7d3fe8", shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  emptyTile: { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.32)", shadowOpacity: 0 },
  selectedTile: { borderColor: "#fffef7", borderWidth: 4, shadowOpacity: 0.5 },
  hintTile: { borderColor: "#ffe66d", borderWidth: 4, shadowColor: "#ffe66d", shadowOpacity: 0.9 },
  characterWrap: { marginTop: 8, marginBottom: 8, alignItems: "center", justifyContent: "center" },
  compactCharacterWrap: { width: 58, height: 58, alignItems: "center", justifyContent: "center", marginHorizontal: 4 },
  characterBubble: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#f7f1ff",
    borderWidth: 6,
    borderColor: "#d7c7ff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#b69ae8",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  compactCharacterBubble: { width: 54, height: 54, borderRadius: 27, borderWidth: 3, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  face: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#f3d7a2",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  compactFace: { width: 40, height: 40, borderRadius: 20 },
  eyeRow: {
    width: 72,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18
  },
  eye: {
    width: 18,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2e1d31",
    borderWidth: 2,
    borderColor: "#fff"
  },
  compactEyeRow: { width: 26, marginTop: 7 },
  compactEye: { width: 7, height: 9, borderRadius: 5, borderWidth: 1 },
  compactMouth: { width: 14, height: 7, borderBottomWidth: 2, borderTopWidth: 2, borderRadius: 8, marginTop: 5 },
  happyMouth: {
    width: 34,
    height: 18,
    borderBottomWidth: 5,
    borderBottomColor: "#e76f51",
    borderRadius: 18,
    marginTop: 14
  },
  sadMouth: {
    width: 34,
    height: 18,
    borderTopWidth: 5,
    borderTopColor: "#e76f51",
    borderRadius: 18,
    marginTop: 18,
    transform: [{ rotate: "180deg" }]
  },
  idleMouth: {
    width: 26,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#d97159",
    marginTop: 18
  },
  cheekLeft: {
    position: "absolute",
    left: 10,
    bottom: 22,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(255, 120, 120, 0.4)"
  },
  cheekRight: {
    position: "absolute",
    right: 10,
    bottom: 22,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(255, 120, 120, 0.4)"
  },
  gloss: { position: "absolute", top: 5, left: 10, right: 10, height: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.46)" },
  sparkle: { position: "absolute", top: 7, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.7)" },
  tileText: { color: "white", fontSize: Math.max(18, CELL * 0.38), fontWeight: "900", textShadowColor: "rgba(60,20,60,0.3)", textShadowRadius: 2 },
  actionRow: { width: BOARD_WIDTH, flexDirection: "row", gap: 10, marginTop: 12 },
  addButton: { flex: 3, minHeight: 58, borderRadius: 22, backgroundColor: "#ff5ca8", borderWidth: 4, borderColor: "#ffd4eb", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  addText: { color: "white", fontSize: 19, fontWeight: "900" },
  addCount: { color: "white", fontSize: 15, fontWeight: "900", borderWidth: 2, borderColor: "rgba(255,255,255,0.7)", borderRadius: 15, paddingHorizontal: 7, paddingVertical: 1 },
  hintButton: { flex: 1, minHeight: 58, borderRadius: 22, backgroundColor: "#52a4ff", borderWidth: 4, borderColor: "#d4ebff", alignItems: "center", justifyContent: "center" },
  hintButtonText: { color: "white", fontSize: 15, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  bottomRow: { width: BOARD_WIDTH, flexDirection: "row", gap: 12, marginTop: 12 },
  restartButton: { flex: 1, minHeight: 54, borderRadius: 20, backgroundColor: "#91b3e3", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#dfeaff" },
  lockedButton: { flex: 1, minHeight: 54, borderRadius: 20, backgroundColor: "#72c887", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#bff1cb" },
  bottomText: { color: "white", fontSize: 15, fontWeight: "900" },
  event: { marginTop: 14, color: "#ffe9c6", fontWeight: "800", textAlign: "center" },
  targetText: { marginTop: 6, color: "#ffc7d9", fontSize: 12, textAlign: "center", fontWeight: "700" },
  target: { marginTop: 4, color: "#ffc7d9", fontSize: 12, textAlign: "center" },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(43,23,48,0.56)", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { width: Math.min(width - 40, 460), backgroundColor: "#fff6f1", borderRadius: 28, padding: 24, alignItems: "center", borderWidth: 4, borderColor: "#ffd7c0" },
  modalTop: { color: "#ff5ea8", fontWeight: "900", letterSpacing: 4, fontSize: 13 },
  modalTitle: { color: "#3b1d5e", fontSize: 38, fontWeight: "900", marginTop: 6, textAlign: "center" },
  modalBody: { color: "#6b3d7b", fontSize: 15, fontWeight: "700", textAlign: "center", marginVertical: 18, lineHeight: 22 },
  nextButton: { width: "100%", backgroundColor: "#ff8a00", borderRadius: 20, minHeight: 58, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#ffdba8" },
  nextText: { color: "white", fontSize: 20, fontWeight: "900" }
});
