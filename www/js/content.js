/* MoonChess — lessons, puzzles, ranks, badges and cosmetics. */
window.CONTENT = (function () {
  const chapters = [
    { id: 'pieces', name: 'Meet the pieces', blurb: 'How every piece moves', missions: [
      { id: 'rook', name: 'The Rook', sub: 'Straight lines', type: 'stars', piece: 'R', at: 'a1', stars: ['a6', 'f6', 'f2'], par: 3,
        say: 'The rook slides in straight lines: up, down, left or right, as far as it likes. Tap a glowing dot to move. Grab all 3 stars!',
        fact: 'The rook used to look like a chariot. Today it looks like a castle tower.' },
      { id: 'bishop', name: 'The Bishop', sub: 'Diagonals', type: 'stars', piece: 'B', at: 'c1', stars: ['e3', 'g5', 'd8'], par: 3,
        say: 'The bishop zooms along diagonals. Secret: it always stays on the same colour square!',
        fact: 'Each player starts with two bishops: one for light squares, one for dark.' },
      { id: 'queen', name: 'The Queen', sub: 'Super piece', type: 'stars', piece: 'Q', at: 'd1', stars: ['h5', 'd5', 'a2'], par: 3,
        say: 'The queen moves like a rook AND a bishop together. She is the strongest piece on the board!',
        fact: 'Hundreds of years ago the queen could only move one square diagonally.' },
      { id: 'king', name: 'The King', sub: 'One small step', type: 'stars', piece: 'K', at: 'e1', stars: ['f3', 'd4', 'e5'], par: 5,
        say: 'The king takes one step at a time, in any direction. Slow, but the most important piece. Collect the stars!',
        fact: 'If your king gets trapped, the game is over. Protect him!' },
      { id: 'knight', name: 'The Knight', sub: 'The L-jump', type: 'stars', piece: 'N', at: 'b1', stars: ['c3', 'e4', 'g5'], par: 3,
        say: 'The knight jumps in an L shape: two squares one way, then one to the side. It is the only piece that can hop over others!',
        fact: 'A knight in the middle of the board can reach up to 8 squares.' },
      { id: 'pawn', name: 'The Pawn', sub: 'Little hero', type: 'stars', piece: 'P', at: 'e2', stars: ['e4', 'd8'], enemies: [['P', 'd5']], par: 5,
        say: 'Pawns walk forward one square (two on their first move). They capture diagonally. Reach the far side and something magical happens!',
        fact: 'A pawn that reaches the last row becomes a queen. That is called promotion.' },
      { id: 'capture', name: 'Capturing', sub: 'Take them!', type: 'stars', piece: 'R', at: 'a1', enemies: [['P', 'a5'], ['P', 'e5'], ['N', 'e8']], par: 3,
        say: 'Land on an enemy piece to capture it. Pieces cannot pass through each other, so plan your path. Capture all 3!',
        fact: 'You never have to capture in chess. But a free piece is usually a good idea!' }
    ] },
    { id: 'rules', name: 'Rules of the game', blurb: 'Check, castling and special moves', missions: [
      { id: 'check', name: 'Check!', sub: 'Escape the attack', type: 'goal', goal: 'any', fen: '4r1k1/8/8/8/8/8/3B4/4K3 w - - 0 1',
        say: 'The black rook attacks your king. That is called CHECK. You must get out of check right away: move the king, block the attack, or capture the attacker. Only safe moves light up!',
        win: 'Safe! You can block with a piece or step aside. You can never leave your king in check.',
        fact: 'In casual games people say "check" out loud, but you don\'t have to.' },
      { id: 'castle', name: 'Castling', sub: 'King to safety', type: 'goal', goal: 'castle', fen: '4k3/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQ - 0 1',
        say: 'Castling is a special move: the king jumps two squares toward a rook, and the rook hops over to the other side. Tap your king and try it!',
        wrong: 'That is a normal move. Tap the king and choose the square two steps to the side.',
        win: 'Castled! Your king is tucked away safely and your rook is ready to play.',
        fact: 'You can only castle if the king and that rook have never moved, and the king is not in check.' },
      { id: 'enpassant', name: 'En passant', sub: 'Sneaky pawn capture', type: 'goal', goal: 'ep', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
        say: 'Black\'s pawn just jumped two squares, right next to yours. For ONE move only, your pawn may capture it as if it had moved just one square. Capture it diagonally!',
        wrong: 'Close! Capture the black pawn by moving diagonally behind it, to d6.',
        win: 'En passant! It is French for "in passing". Now you know the sneakiest rule in chess.',
        fact: 'If you don\'t use en passant immediately, the chance is gone.' },
      { id: 'promote', name: 'Promotion', sub: 'Pawn power-up', type: 'goal', goal: 'promo', fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1',
        say: 'Your pawn is one step from the end. Move it to the last row and pick what it becomes: queen, rook, bishop or knight!',
        win: 'Power-up complete! Most players pick a queen because she is the strongest.',
        fact: 'You could have nine queens at once in theory: your original plus eight promoted pawns!' },
      { id: 'mate1', name: 'Checkmate!', sub: 'Win the game', type: 'mate', n: 1, fen: '7k/8/6K1/8/8/8/8/3Q4 w - - 0 1',
        say: 'Checkmate means the king is attacked and has no escape. That wins the game! Your king on g6 helps. Find the winning queen move.',
        fact: 'Checkmate comes from the Persian "shah mat", meaning "the king is helpless".' },
      { id: 'stalemate', name: 'Stalemate trap', sub: 'Don\'t draw!', type: 'mate', n: 1, fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1',
        say: 'Careful! If the enemy king is NOT in check but has no legal move, it\'s stalemate, a draw. Find the move that checkmates instead.',
        fact: 'Stalemate has saved many players who were losing badly. Always check the enemy king has a move!' }
    ] },
    { id: 'openings', name: 'Smart starts', blurb: 'Good habits for the opening', missions: [
      { id: 'centre', name: 'Grab the centre', sub: 'First move', type: 'quiz', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        say: 'The four middle squares are the most important on the board. Which first move is best?',
        opts: [{ u: 'e2e4', ok: true, why: 'e4 takes space in the centre and opens paths for your queen and bishop.' },
          { u: 'h2h4', why: 'h4 does little. Edge pawns don\'t help control the centre.' },
          { u: 'a2a3', why: 'a3 wastes time. Start in the middle!' }],
        fact: 'e4 and d4 are the two most popular first moves in history.' },
      { id: 'develop', name: 'Wake up your pieces', sub: 'Development', type: 'quiz', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        say: 'Get your knights and bishops off the back row early. That\'s called developing. Which move is best here?',
        opts: [{ u: 'g1f3', ok: true, why: 'Nf3 develops a piece AND attacks the e5 pawn. Two jobs in one move!' },
          { u: 'e1e2', why: 'Moving your king early puts it in danger and blocks your bishop.' },
          { u: 'a2a4', why: 'a4 leaves your pieces asleep at home.' }],
        fact: 'A good rule: knights before bishops, and don\'t move the same piece twice early on.' },
      { id: 'safety', name: 'Castle early', sub: 'King safety', type: 'quiz', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        say: 'Your knight and bishop are out. Now what should you do?',
        opts: [{ u: 'e1g1', ok: true, why: 'Castling hides your king behind pawns and connects your rooks. Perfect timing!' },
          { u: 'e1f1', why: 'Kf1 moves the king without castling, and you lose the right to castle.' },
          { u: 'h1g1', why: 'Rg1 moves the rook, so you can\'t castle that side any more.' }],
        fact: 'Most strong players castle within the first ten moves.' },
      { id: 'nextpiece', name: 'Bring out the bishop', sub: 'Keep developing', type: 'quiz', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        say: 'Knight is out. Which move keeps your development going?',
        opts: [{ u: 'f1c4', ok: true, why: 'Bc4 develops and aims at f7, Black\'s weakest square.' },
          { u: 'f3g1', why: 'Moving the knight back home undoes your good work.' },
          { u: 'h2h3', why: 'h3 is too slow here. Get your pieces out first.' }],
        fact: 'This opening, with Bc4, is called the Italian Game. It is over 400 years old!' }
    ] },
    { id: 'tactics', name: 'Tactics', blurb: 'Tricks that win pieces', missions: [
      { id: 'free', name: 'Free piece', sub: 'Spot it, take it', type: 'tactic', fen: 'rnbqkbnr/pppp1ppp/8/8/3nP3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4', sol: 'f3d4',
        say: 'One of Black\'s pieces is unprotected. Nobody can recapture if you take it. Find it!',
        win: 'Nxd4 wins a whole knight for free. Always ask: is anything unprotected?',
        fact: 'Strong players check every move: "What does my opponent\'s last move attack?"' },
      { id: 'fork', name: 'Knight fork', sub: 'Two at once', type: 'tactic', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', sol: 'b5c7',
        say: 'A fork attacks two pieces at the same time. Find the knight jump that attacks the king AND the rook!',
        win: 'Nc7+ forks king and rook. The king must move, and then you take the rook!',
        fact: 'Knights are the best forkers because their attacks are hard to see coming.' },
      { id: 'skewer', name: 'Skewer', sub: 'Through the king', type: 'tactic', fen: '8/1q6/8/8/8/1k6/8/K3R3 w - - 0 1', sol: 'e1b1',
        say: 'A skewer attacks a valuable piece, and when it moves, you win the piece behind it. Check the king on the b-file!',
        win: 'Rb1+! The king has to step off the b-file, and then your rook takes the queen.',
        fact: 'A skewer is like a pin turned around: the more valuable piece is in front.' }
    ] },
    { id: 'mates', name: 'Checkmate patterns', blurb: 'Famous ways to win', missions: [
      { id: 'backrank', name: 'Back-rank mate', sub: 'Trapped by pawns', type: 'mate', n: 1, fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
        say: 'Black\'s king is stuck behind its own pawns. Can you deliver checkmate on the back row?',
        fact: 'Making a little escape square for your king (like h3) protects you from this.' },
      { id: 'smothered', name: 'Smothered mate', sub: 'Knight magic', type: 'mate', n: 1, fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
        say: 'The black king is surrounded by its own pieces. One knight jump finishes the game!',
        fact: 'Smothered mate is one of the most beautiful patterns in chess.' },
      { id: 'tworooks', name: 'Two rooks', sub: 'Teamwork', type: 'mate', n: 1, fen: 'k7/8/8/8/8/8/1R6/7R w - - 0 1',
        say: 'One rook guards the b-file. Use the other to checkmate along the edge!',
        fact: 'Two rooks working together can checkmate a lone king easily.' },
      { id: 'arabian', name: 'Arabian mate', sub: 'Rook + knight', type: 'mate', n: 1, fen: '7k/R7/5N2/8/8/8/8/6K1 w - - 0 1',
        say: 'Your knight protects a square next to the king. Bring the rook there for checkmate!',
        fact: 'The Arabian mate is over a thousand years old.' },
      { id: 'ladder', name: 'Rook ladder', sub: 'Mate in 2', type: 'mate', n: 2, fen: '6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1',
        say: 'This takes two moves. The rooks climb like a ladder: one cuts off a row, the other gives checkmate.',
        fact: 'The ladder (or "lawnmower") mate is a great way to win with two rooks.' }
    ] }
  ];

  const puzzles = [
    ['6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 1, 'Back rank'],
    ['6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', 1, 'Smothered'],
    ['r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 1, 'Scholar\'s mate'],
    ['rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2', 1, 'Fool\'s mate'],
    ['6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 1, 'Back rank'],
    ['k7/8/8/8/8/8/1R6/7R w - - 0 1', 1, 'Two rooks'],
    ['7k/R7/5N2/8/8/8/8/6K1 w - - 0 1', 1, 'Arabian'],
    ['k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', 1, 'Avoid stalemate'],
    ['6k1/5p1p/5PpQ/8/8/8/8/6K1 w - - 0 1', 1, 'Queen kiss'],
    ['3k4/8/3K4/8/8/8/8/7R w - - 0 1', 1, 'King + rook'],
    ['6k1/6p1/6Kp/8/8/8/8/R7 w - - 0 1', 1, 'Edge mate'],
    ['1r4k1/5ppp/8/8/8/8/5PPP/1Q4K1 b - - 0 1', 1, 'Black to move'],
    ['5k2/5P2/5K2/8/8/8/8/7R w - - 0 1', 1, 'Pawn helper'],
    ['4k3/8/4K3/8/8/8/8/R7 w - - 0 1', 1, 'King + rook'],
    ['3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', 1, 'Black to move'],
    ['k1r5/pp6/8/8/8/8/8/2R1R1K1 w - - 0 1', 1, 'Capture and mate'],
    ['6k1/5ppp/4p3/8/8/8/5PPP/2Q3K1 w - - 0 1', 1, 'Queen back rank'],
    ['r6k/6pp/8/8/8/8/1B6/1K4Q1 w - - 0 1', 1, 'Battery'],
    ['6k1/4Rppp/8/8/8/8/8/4R1K1 w - - 0 1', 1, 'Doubled rooks'],
    ['7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', 1, 'Many mates'],
    ['6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1', 2, 'Rook ladder'],
    ['k7/8/8/8/8/8/8/1R2K2R w K - 0 1', 2, 'Cut off'],
    ['7k/8/5K2/8/8/8/8/6R1 w - - 0 1', 2, 'Quiet king move'],
    ['6k1/8/8/8/8/8/8/RR4K1 w - - 0 1', 2, 'Rook ladder'],
    ['2k5/8/8/8/8/8/8/RR2K3 w - - 0 1', 2, 'Rook ladder']
  ].map(([fen, n, tag], i) => ({ id: 'p' + (i + 1), fen, n, tag, name: 'Puzzle ' + (i + 1) }));

  const ranks = [
    { name: 'Cadet', xp: 0 }, { name: 'Pilot', xp: 200 }, { name: 'Navigator', xp: 500 },
    { name: 'Captain', xp: 1000 }, { name: 'Commander', xp: 1800 }, { name: 'Admiral', xp: 3000 }
  ];

  const bots = [
    { id: 'sleepy', name: 'Sleepy Bot', desc: 'Yawns a lot and makes silly mistakes. Perfect for your first games.', xp: 40, color: '#8ad8ff' },
    { id: 'cadet', name: 'Cadet Bot', desc: 'Knows the rules and grabs free pieces. A fair fight.', xp: 80, color: '#ffd84a' },
    { id: 'captain', name: 'Captain Bot', desc: 'Thinks ahead and punishes mistakes. For brave players!', xp: 150, color: '#ff4fd8' }
  ];

  // test(s) receives the save state
  const badges = [
    { id: 'first', name: 'Lift-off', desc: 'Finish your first mission', test: s => Object.keys(s.done).length >= 1 },
    { id: 'pieces', name: 'Piece expert', desc: 'Finish "Meet the pieces"', test: (s, C) => chapterDone(s, 'pieces') },
    { id: 'rules', name: 'Rule master', desc: 'Finish "Rules of the game"', test: s => chapterDone(s, 'rules') },
    { id: 'openings', name: 'Smart starter', desc: 'Finish "Smart starts"', test: s => chapterDone(s, 'openings') },
    { id: 'tactics', name: 'Trickster', desc: 'Finish "Tactics"', test: s => chapterDone(s, 'tactics') },
    { id: 'mates', name: 'Mate maker', desc: 'Finish "Checkmate patterns"', test: s => chapterDone(s, 'mates') },
    { id: 'allstars', name: 'Superstar', desc: 'Get 3 stars on every mission', test: s => allMissions().every(m => s.done[m.id] === 3) },
    { id: 'p5', name: 'Puzzle pal', desc: 'Solve 5 puzzles', test: s => Object.keys(s.puzzles).length >= 5 },
    { id: 'p20', name: 'Puzzle wizard', desc: 'Solve 20 puzzles', test: s => Object.keys(s.puzzles).length >= 20 },
    { id: 'daily3', name: 'Daily habit', desc: 'Solve 3 daily puzzles', test: s => Object.keys(s.daily).length >= 3 },
    { id: 'streak3', name: 'On fire', desc: 'Play 3 days in a row', test: s => s.bestStreak >= 3 },
    { id: 'streak7', name: 'Unstoppable', desc: 'Play 7 days in a row', test: s => s.bestStreak >= 7 },
    { id: 'wsleepy', name: 'Wake-up call', desc: 'Beat Sleepy Bot', test: s => s.wins.sleepy > 0 },
    { id: 'wcadet', name: 'Fair fighter', desc: 'Beat Cadet Bot', test: s => s.wins.cadet > 0 },
    { id: 'wcaptain', name: 'Captain\'s rival', desc: 'Beat Captain Bot', test: s => s.wins.captain > 0 },
    { id: 'games10', name: 'Space veteran', desc: 'Play 10 full games', test: s => s.games >= 10 }
  ];
  function allMissions() { return chapters.flatMap(c => c.missions); }
  function chapterDone(s, id) { return chapters.find(c => c.id === id).missions.every(m => s.done[m.id] > 0); }

  const themes = [
    { id: 'nebula', name: 'Nebula', need: 'Cadet', l: '#93a7f0', l2: '#8097e8', d: '#1d2a70', d2: '#18225e', glow: '#3ef2ff' },
    { id: 'mars', name: 'Mars base', need: 'Pilot', l: '#eab392', l2: '#dea07c', d: '#6e2c1f', d2: '#5c2419', glow: '#ffb35a' },
    { id: 'aurora', name: 'Aurora', need: 'Navigator', l: '#93e2ca', l2: '#7bd5ba', d: '#14524a', d2: '#10433c', glow: '#6dffc4' },
    { id: 'classic', name: 'Classic', need: 'Captain', l: '#f0d9b5', l2: '#e8cfa6', d: '#b58863', d2: '#a37752', glow: '#ffe08a' },
    { id: 'gold', name: 'Golden fleet', need: 'Admiral', l: '#ead27e', l2: '#dec366', d: '#5e4c13', d2: '#4c3d0e', glow: '#ffd84a' }
  ];
  const skins = [
    { id: 'classic', name: 'Classic Pip', need: null, body: '#c9d6ff', trim: '#5a6bd8', eye: '#3ef2ff' },
    { id: 'pink', name: 'Nova Pip', need: 'wsleepy', body: '#ffc2f0', trim: '#c23aa6', eye: '#ff4fd8' },
    { id: 'mint', name: 'Alien Pip', need: 'streak3', body: '#b6ffd9', trim: '#2f9f6f', eye: '#6dffc4' },
    { id: 'gold', name: 'Golden Pip', need: 'allstars', body: '#ffe7a0', trim: '#c9921a', eye: '#fff3b0' },
    { id: 'shadow', name: 'Shadow Pip', need: 'wcaptain', body: '#4a4f6e', trim: '#1c1f33', eye: '#ff4fd8' }
  ];

  return { chapters, puzzles, ranks, bots, badges, themes, skins, allMissions };
})();
