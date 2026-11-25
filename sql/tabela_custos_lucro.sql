-- Tabela de custos com lucro em todo uso   2026-11-25
-- Medição dos últimos 60 dias (só alunos): o custo real por Falcoin gasto era
-- R$ 8,96 nas aulas em slides, R$ 4,90 no tutor por voz e R$ 4,28 no Raio-X, contra
-- R$ 4,96 líquidos por Falcoin vendido (R$ 6,20 menos ~20% de taxa e impostos).
-- Aulas davam prejuízo em qualquer pacote. Novos valores deixam cada ação com
-- ~30% de margem no pacote de 10 e ainda lucro no de 100 (R$ 5,49 por Falcoin).
-- O resto da tabela (tutor de texto, busca, flashcards, idiomas) já dava lucro e não muda.
update carteira.tabela_custos t set valor = v.valor, atualizado_em = now()
from (values
  ('aula_resumo_curto',   5.0),
  ('aula_resumo',        10.0),
  ('aula_completa',      15.0),
  ('aula_completa_extra', 0.5),
  ('aula_secao',          1.3),
  ('tutor_voz',           0.17),
  ('raiox',               0.7),
  ('raiox_discursivas',   1.1)
) as v(acao, valor)
where t.acao = v.acao;

-- a descrição do excedente cita o valor antigo
update carteira.tabela_custos
   set descricao = 'Acréscimo da aula completa: 0,5 ƒ a cada mil palavras de material acima das 15 mil da base.'
 where acao = 'aula_completa_extra';

select acao, valor from carteira.tabela_custos
 where acao in ('aula_resumo_curto','aula_resumo','aula_completa','aula_completa_extra','aula_secao','tutor_voz','raiox','raiox_discursivas')
 order by acao;
