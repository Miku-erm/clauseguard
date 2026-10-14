import type { FixtureExpectation } from './fixture-expectations';
export const DEMO_RENEWAL = 'Your subscription automatically renews every month. Your payment method will be charged unless you cancel before the renewal date.';
export const DEMO_NOTICE = 'No advance renewal reminder is provided. Cancellation must reach us thirty days before the renewal charge.';
export const DEMO_NEGATIVE = 'Your subscription does not renew automatically. You must manually confirm every renewal.';
export function demoFixtureExpectation(url: string): FixtureExpectation | undefined {
  const name = /^http:\/\/127\.0\.0\.1:4173\/demo\/(risk|negative|expandable|flow)\.html$/.exec(url)?.[1];
  if (!name) return undefined;
  return { rootId: 'contract', controls: ['expandable', 'flow'].includes(name) ? ['open-agreement'] : [],
    blocks: { 'policy-title': 'Subscription Terms', 'clause-1': name === 'negative' ? DEMO_NEGATIVE : DEMO_RENEWAL,
      ...(name === 'negative' ? {} : { 'clause-2': DEMO_NOTICE }) } };
}
