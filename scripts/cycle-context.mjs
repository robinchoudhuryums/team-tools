#!/usr/bin/env node
// cycle-context.mjs — SessionStart hook (ROADMAP R6).
//
// Prints the workflow "substrate" (per CLAUDE.md "Cycle State & Memory":
// the things safe to carry forward — STATE, invariants, current standing)
// so a fresh Claude Code session starts oriented without manual pasting.
// Wire it via .claude/settings.json:
//   { "hooks": { "SessionStart": [ { "hooks": [
//       { "type": "command", "command": "node scripts/cycle-context.mjs" } ] } ] } }
//
// Fully additive and fail-safe: with no .cycle/ it prints nothing; it
// never throws and always exits 0, so it can't break a session.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = p => { try { return readFileSync(p, 'utf8'); } catch { return null; } };

// Extract the body of a "## <heading>" section from a markdown doc.
function section(md, heading) {
  if (!md) return null;
  const lines = md.split('\n');
  const h = heading.toLowerCase();
  const i = lines.findIndex(l => /^##\s+/.test(l) && l.replace(/^##\s+/, '').trim().toLowerCase().startsWith(h));
  if (i === -1) return null;
  const body = [];
  for (let j = i + 1; j < lines.length; j++) { if (/^##\s+/.test(lines[j])) break; body.push(lines[j]); }
  return body.join('\n').trim();
}

try {
  if (!existsSync(join(root, '.cycle'))) process.exit(0); // not adopted — stay quiet

  const out = ['=== WORKFLOW CONTEXT (auto-loaded by SessionStart hook) ==='];
  const state = read(join(root, '.cycle', 'STATE.md'));
  for (const h of ['Current', 'Where I left off', 'Pending / not yet done']) {
    const s = section(state, h);
    if (s) out.push(`\n## ${h}\n${s}`);
  }
  const standing = section(read(join(root, 'PROJECT_HEALTH.md')), 'Current Standing');
  if (standing) out.push(`\n## Current Standing (PROJECT_HEALTH.md)\n${standing}`);

  const hasCfg = existsSync(join(root, '.cycle', 'config.md'));
  const cfg = (hasCfg && read(join(root, '.cycle', 'config.md'))) || read(join(root, 'CLAUDE.md'));
  const invCount = cfg ? (cfg.match(/^INV-\d+\s*\|/gm) || []).length : 0;
  if (invCount) out.push(`\nInvariant library: ${invCount} invariants (see ${hasCfg ? '.cycle/config.md' : 'CLAUDE.md'}). Carry these forward; re-derive audit findings with fresh eyes.`);

  out.push('\nSubstrate above carries forward; a new audit uses fresh eyes. Run /cycle-status for the full picture, /cycle-resume to continue in-progress work.');
  out.push('=== END WORKFLOW CONTEXT ===');
  process.stdout.write(out.join('\n') + '\n');
} catch {
  // Never break a session over context loading.
}
process.exit(0);
