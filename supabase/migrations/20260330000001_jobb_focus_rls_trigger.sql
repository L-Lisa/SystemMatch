-- Enable RLS on jobb_focus
alter table jobb_focus enable row level security;

-- Service role bypass — only the API (service role) can access this table
create policy "Service role full access" on jobb_focus
  for all
  using (true)
  with check (true);

-- Auto-update updated_at on row changes
create or replace function update_jobb_focus_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trg_jobb_focus_updated_at
  before update on jobb_focus
  for each row
  execute function update_jobb_focus_updated_at();
