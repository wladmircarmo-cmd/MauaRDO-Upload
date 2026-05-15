alter table public.external_ccs
add column if not exists show_in_app boolean not null default false;

create index if not exists external_ccs_show_in_app_idx
  on public.external_ccs (show_in_app);

comment on column public.external_ccs.show_in_app is
  'Controls whether this cost center appears in upload and consulta screens.';
