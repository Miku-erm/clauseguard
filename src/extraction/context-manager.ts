import { authorizedPolicyUrl, type LlmsDiscovery } from './llms-txt';
/** Discovery candidates are separate from extracted/hashed contractual evidence. */
export function policyCandidates(discovery: LlmsDiscovery, pageUrl: string) {
  return discovery.status === 'FOUND' ? discovery.links.filter(link => authorizedPolicyUrl(link.url, pageUrl) === link.url) : [];
}
