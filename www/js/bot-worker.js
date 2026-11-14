/* Runs bot thinking off the main thread so the starfield never freezes. */
importScripts('engine.js');
onmessage = e => {
  const { id, fen, level, task, depth } = e.data;
  const p = Chess.parse(fen);
  if (task === 'best') {
    const r = Chess.best(p, depth || 2);
    postMessage({ id, uci: r ? Chess.uci(r.m) : null });
  } else if (task === 'scores') {
    postMessage({ id, scores: Chess.scoreMoves(p, depth || 2).map(x => [Chess.uci(x.m), x.s]) });
  } else {
    const m = Chess.botMove(p, level);
    postMessage({ id, uci: m ? Chess.uci(m) : null });
  }
};
