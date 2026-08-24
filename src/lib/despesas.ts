import type { Despesa } from './tipos';

/**
 * A categoria que mais pesa no período, escrita para caber embaixo do número.
 *
 * Vive fora da tela porque estava dentro de um `useMemo` de dependências
 * incompletas: ao navegar para um período anterior, o rótulo continuava
 * mostrando a categoria do período de antes.
 */
export function categoriaQueMaisPesa(despesas: Despesa[]): string | null {
  if (despesas.length === 0) return null;

  const porCategoria = new Map<string, number>();
  for (const d of despesas) {
    porCategoria.set(d.categoria, (porCategoria.get(d.categoria) ?? 0) + d.valor_centavos);
  }

  const ordenadas = [...porCategoria.entries()].sort(
    // empate desempata pelo nome, para o rótulo não dançar entre buscas
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );

  const [nome, total] = ordenadas[0];
  if (total <= 0) return null;

  return `${nome.toLowerCase()} é o maior gasto`;
}
