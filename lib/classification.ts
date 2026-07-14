// Classificação: assunto + preview → sugestão de categoria. Ver docs/dominio.md.
// Determinística, sem LLM. Se um classificador melhor entrar um dia, entra
// atrás desta mesma interface.

export interface ClassificationRule {
  id: string;
  pattern: string;
  categoryId: string;
  active: boolean;
  createdAt: Date;
}

export interface ClassificationInput {
  subject: string;
  preview: string;
}

export interface ClassificationSuggestion {
  /** Nulo quando nenhuma regra casa; a demanda vai para revisão sem categoria. */
  categoryId: string | null;
  /** Ids de todas as regras que casaram, na ordem avaliada — insumo da revisão. */
  matchedRuleIds: string[];
}

/**
 * Casa assunto e preview contra as regras ativas, por substring
 * case-insensitive. Com múltiplas regras casando, a sugestão é a da primeira
 * regra na ordem de criação (createdAt, id como desempate) — determinístico
 * independente da ordem em que as regras chegam.
 *
 * O resultado é sempre sugestão: a demanda nasce com
 * classificationConfirmed = false e só sai da revisão pela mão do analista.
 */
export function suggestCategory(
  input: ClassificationInput,
  rules: readonly ClassificationRule[],
): ClassificationSuggestion {
  const haystack = `${input.subject}\n${input.preview}`.toLowerCase();

  const activeRules = rules
    .filter((rule) => rule.active)
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );

  const matchedRuleIds: string[] = [];
  let firstMatch: ClassificationRule | undefined;
  for (const rule of activeRules) {
    const pattern = rule.pattern.trim().toLowerCase();
    // Pattern vazio casaria tudo; validação bloqueia na escrita, aqui é defesa.
    if (pattern !== "" && haystack.includes(pattern)) {
      matchedRuleIds.push(rule.id);
      firstMatch ??= rule;
    }
  }

  return {
    categoryId: firstMatch ? firstMatch.categoryId : null,
    matchedRuleIds,
  };
}
