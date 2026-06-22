import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dependencyToRendererLine,
  dependencyToRendererLines,
  rendererDependencyGroups,
  rendererModularizationLines,
} from './renderer-dependency-plan.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

const corePackage = readJson('packages/core/package.json');
const dependencies = Object.keys(corePackage.dependencies || {}).sort();
const rows = dependencies.map(name => ({
  dependency: name,
  group: dependencyToRendererLine.get(name)?.group || 'unclassified',
  rendererLine: dependencyToRendererLine.get(name)?.id || 'unclassified',
  targetPackage: dependencyToRendererLines.get(name)?.map(line => line.targetPackage).join(', ') || 'unclassified',
  phase: dependencyToRendererLine.get(name)?.phase || null,
  status: dependencyToRendererLine.get(name)?.status || 'unclassified',
  sharedBy: dependencyToRendererLines.get(name)?.map(line => line.id) || [],
  version: corePackage.dependencies[name],
}));

const byGroup = rows.reduce((result, row) => {
  result[row.group] ||= [];
  result[row.group].push(row);
  return result;
}, {});

const plannedDependencies = new Set(Object.values(rendererDependencyGroups).flat());
const missingPlannedDependencies = Array.from(plannedDependencies)
  .filter(name => !dependencies.includes(name))
  .sort();
const phaseSummary = rendererModularizationLines.reduce((result, line) => {
  result[line.phase] ||= { totalLines: 0, directDependencies: 0 };
  result[line.phase].totalLines += 1;
  result[line.phase].directDependencies += line.dependencies.filter(name => dependencies.includes(name)).length;
  return result;
}, {});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    total: rows.length,
    groups: byGroup,
    rows,
    rendererLines: rendererModularizationLines,
    missingPlannedDependencies,
    phaseSummary,
  }, null, 2));
} else {
  console.log(`@file-viewer/core direct dependencies: ${rows.length}`);
  Object.entries(byGroup).forEach(([group, items]) => {
    console.log(`\n[${group}] ${items.length}`);
    items.forEach(item => {
      const sharedLabel = item.sharedBy.length > 1 ? `, shared: ${item.sharedBy.join(' + ')}` : '';
      console.log(`  - ${item.dependency}@${item.version} -> ${item.rendererLine} -> ${item.targetPackage} (phase ${item.phase ?? 'n/a'}, ${item.status}${sharedLabel})`);
    });
  });
  console.log('\n[phase summary]');
  Object.entries(phaseSummary)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([phase, summary]) => {
      console.log(`  - phase ${phase}: ${summary.totalLines} renderer lines, ${summary.directDependencies} dependencies still declared by core`);
    });
  if (byGroup.unclassified?.length) {
    console.log('\nUnclassified dependencies must be reviewed before renderer modularization gates become blocking.');
  }
  if (missingPlannedDependencies.length) {
    console.log('\nPlanned dependencies already absent from core direct dependencies:');
    missingPlannedDependencies.forEach(name => {
      console.log(`  - ${name}`);
    });
  }
}
