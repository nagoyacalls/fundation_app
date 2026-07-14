// Categoria é tabela, não texto livre (docs/dominio.md): grafias divergentes
// virariam categorias distintas no gráfico. O analista continua digitando —
// a consolidação vem da normalização + Category.name único, não de disciplina.

/**
 * Forma canônica do nome: sem acentos, minúsculas, espaços viram "_".
 * "Férias" e "ferias" são a MESMA categoria; "Folha Holerite" vira
 * "folha_holerite".
 */
export function normalizeCategoryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}
