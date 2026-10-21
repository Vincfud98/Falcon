-- ════════════════════════════════════════════════════════════════════════
-- Histórico de ações por matrícula — vendas.enrollment_events
-- Cada ação na matrícula (criada, estendida, renovada, pausada, reativada,
-- cancelada, estorno) vira uma linha aqui. O admin mostra a timeline.
-- Rode no SQL Editor do Supabase (projeto kluqjqojxzpuiauuidwx).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists vendas.enrollment_events (
  id            bigint generated always as identity primary key,
  enrollment_id uuid        not null references vendas.enrollments(id) on delete cascade,
  action        text        not null,   -- created|extended|renewed|paused|resumed|cancelled|refund_cancel
  reason        text,
  actor         text,                   -- e-mail do admin que fez a ação
  meta          jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists enrollment_events_enr_idx
  on vendas.enrollment_events (enrollment_id, created_at desc);

alter table vendas.enrollment_events enable row level security;

-- Só admin lê/grava (espelha o resto do schema vendas).
drop policy if exists enrollment_events_admin_all on vendas.enrollment_events;
create policy enrollment_events_admin_all on vendas.enrollment_events
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert on vendas.enrollment_events to authenticated;
grant usage on all sequences in schema vendas to authenticated;

notify pgrst, 'reload schema';
