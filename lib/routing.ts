// Roteamento: domínio do remetente → empresa. Ver docs/dominio.md.
// Função pura sobre a tabela de domínios; quem chama busca as rotas no banco.

export interface DomainRoute {
  domain: string;
  companyId: string;
}

export type RoutingResult =
  | { companyId: string; unclassified: false }
  | { companyId: null; unclassified: true };

/**
 * Domínios de provedores genéricos de e-mail. Nunca identificam uma empresa,
 * então nunca podem virar CompanyDomain — o bloqueio é na escrita
 * (lib/validations.ts), não na leitura.
 */
export const GENERIC_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.com.br",
  "live.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "bol.com.br",
  "uol.com.br",
  "terra.com.br",
]);

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

export function isGenericDomain(domain: string): boolean {
  return GENERIC_DOMAINS.has(normalizeDomain(domain));
}

/**
 * Resolve o domínio do remetente contra a tabela de roteamento.
 * Sem correspondência a demanda segue existindo, apenas não classificada —
 * nenhum e-mail é descartado.
 */
export function resolveCompany(
  senderDomain: string,
  routes: readonly DomainRoute[],
): RoutingResult {
  const domain = normalizeDomain(senderDomain);
  if (domain !== "") {
    for (const route of routes) {
      if (normalizeDomain(route.domain) === domain) {
        return { companyId: route.companyId, unclassified: false };
      }
    }
  }
  return { companyId: null, unclassified: true };
}
