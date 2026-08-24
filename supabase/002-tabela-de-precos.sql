-- ============================================================
-- Ateliê · 002 · Tabela de preços inicial
--
-- Só um ponto de partida: depois é tudo editável em Painel → Tabela de preços.
--
-- Só preenche se a tabela estiver vazia. Ou seja: se você já mexeu nos preços,
-- rodar este arquivo de novo não faz nada e não duplica nada.
-- ============================================================
do $$
begin
  if not exists (select 1 from servicos) then
    insert into servicos (nome, categoria, descricao, preco_centavos, prazo_dias, ordem) values
      ('Barra de calça simples',        'Barras',    'Corte reto, feito na máquina',            2500,  5,  1),
      ('Barra de calça jeans original', 'Barras',    'Mantém a barra original do jeans',        4500,  7,  2),
      ('Barra de vestido ou saia',      'Barras',    'Acabamento invisível',                    4000,  7,  3),
      ('Ajuste de cós',                 'Ajustes',   'Apertar ou soltar a cintura',             3500,  7,  4),
      ('Ajuste lateral de camisa',      'Ajustes',   'Afinar o corpo da peça',                  4000,  7,  5),
      ('Ajuste de manga',               'Ajustes',   'Encurtar ou afinar',                      3500,  7,  6),
      ('Troca de zíper — calça',        'Consertos', 'Zíper incluso',                           4500,  7,  7),
      ('Troca de zíper — vestido',      'Consertos', 'Zíper invisível incluso',                 6500,  7,  8),
      ('Cerzido e remendo',             'Consertos', 'Reparo em rasgo ou furo',                 3000,  5,  9),
      ('Troca de forro',                'Consertos', 'Blazer, casaco ou saia',                 12000, 14, 10),
      ('Ajuste de vestido de festa',    'Festa',     'Prova marcada à parte',                  18000, 14, 11),
      ('Ajuste de vestido de noiva',    'Festa',     'Inclui até duas provas',                 45000, 21, 12),
      ('Customização de peça',          'Sob medida','Valor combinado na conversa',                0, 14, 13),
      ('Peça sob medida',               'Sob medida','Valor definido após medidas e tecido',       0, 21, 14),
      ('Bainha de cortina (por metro)', 'Casa',      'Preço por metro linear',                  3000, 10, 15);
  end if;
end $$;
