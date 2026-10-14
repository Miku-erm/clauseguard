import scenarios from '../../fixtures/p2/scenarios.json';
import type { FixtureExpectation } from './fixture-expectations';
export const LONG_SAFE_CLAUSE = 'This paragraph describes fictional service support hours. Support is available from Monday to Friday. Help articles do not require personal information. We do not sell personal data. Optional analytics requires revocable consent and usage events are deleted after thirty days.';
const longBlocks: Record<string, string> = { 'policy-title': 'Subscription Terms', 'clause-1': scenarios[0]!.paragraphs[0]! };
for (let index = 1; index <= 180; index++) longBlocks[`clause-${index + 1}`] = `Clause ${index}. ${LONG_SAFE_CLAUSE}`;
longBlocks['clause-182'] = scenarios[1]!.paragraphs[0]!;
export function p2FixtureExpectation(url: string): FixtureExpectation | undefined {
  const match = /^http:\/\/127\.0\.0\.1:4173\/p2\/(renewal|sharing|denial|cancellation|ambiguous|injection|safe|long)\.html$/.exec(url);
  if (!match) return undefined;
  if (match[1] === 'long') return { rootId: 'contract', blocks: longBlocks, controls: [] };
  const scenario = scenarios.find(scenario => scenario.name === match[1])!;
  return { rootId: 'contract', controls: [], blocks: { 'policy-title': scenario.title, ...Object.fromEntries(scenario.paragraphs.map((text, index) => [`clause-${index + 1}`, text])) } };
}
