// SUNSET BAY — the entry program (Node 22, standard library only).
// It hands the game in: copies game/ and screenshots/ from this repository
// into the output directory and writes dossier.json with the vendored
// make.fun library, the summary the judge reads.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the folder holding this file.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
// The grader hands us /output; locally MAKEFUN_OUTPUT_DIR stands in for it.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyGameTree() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  const shots = join(repoRoot, 'screenshots');
  if (existsSync(shots)) {
    cpSync(shots, join(outDir, 'screenshots'), { recursive: true });
  }
}

function writeDossier() {
  // The sealed scorer's caps, as the kit's reference/gate.json states them:
  // the dossier text is capped at 160 KiB, at most 4 screenshots of 256 KiB
  // each, game/ at most 993 files and 48 MiB, paths at most 1000 bytes.
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

copyGameTree();
writeDossier();
console.log('SUNSET BAY dossier written to', join(outDir, 'dossier.json'));
