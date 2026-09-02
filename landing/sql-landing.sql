-- Landing page editável no admin: conteúdo publicado e rascunho na configuração global
alter table conteudo.platform_config add column if not exists landing jsonb;
alter table conteudo.platform_config add column if not exists landing_draft jsonb;

-- Fotos da landing (professores, alunos): bucket público, escrita só de admin
insert into storage.buckets (id, name, public) values ('landing', 'landing', true)
on conflict (id) do update set public = true;

drop policy if exists "landing público lê" on storage.objects;
create policy "landing público lê" on storage.objects for select using (bucket_id = 'landing');
drop policy if exists "landing admin envia" on storage.objects;
create policy "landing admin envia" on storage.objects for insert to authenticated with check (bucket_id = 'landing' and is_admin());
drop policy if exists "landing admin troca" on storage.objects;
create policy "landing admin troca" on storage.objects for update to authenticated using (bucket_id = 'landing' and is_admin());
drop policy if exists "landing admin apaga" on storage.objects;
create policy "landing admin apaga" on storage.objects for delete to authenticated using (bucket_id = 'landing' and is_admin());

-- Conferência
select column_name from information_schema.columns
 where table_schema = 'conteudo' and table_name = 'platform_config' and column_name in ('landing', 'landing_draft');
select id, public from storage.buckets where id = 'landing';
