create table if not exists public.subscription_history (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  previous_plan_id uuid references public.subscription_plans(id),
  new_plan_id uuid not null references public.subscription_plans(id),
  action text not null default 'renew_or_change',
  billing_cycle text not null,
  amount numeric,
  currency text default 'GNF',
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'active',
  performed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscription_history_school on public.subscription_history(school_id, created_at desc);

grant select on public.subscription_history to authenticated;
grant all on public.subscription_history to service_role;

alter table public.subscription_history enable row level security;

create policy "School staff can view their subscription history"
on public.subscription_history for select to authenticated
using (
  public.is_super_admin(auth.uid())
  or (
    public.same_school(school_id)
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'directeur') or public.has_role(auth.uid(), 'comptable'))
  )
);

create trigger update_subscription_history_updated_at
before update on public.subscription_history
for each row execute function public.touch_updated_at();

create or replace function public.renew_or_change_subscription(
  p_school_id uuid,
  p_new_plan_id uuid,
  p_billing_cycle text default 'monthly'
)
returns public.school_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.subscription_plans;
  v_start timestamptz := now();
  v_end timestamptz;
  v_amount numeric;
  v_row public.school_subscriptions;
  v_prev_plan uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_billing_cycle not in ('monthly','yearly') then
    raise exception 'Cycle de facturation invalide';
  end if;

  if not (
    public.is_super_admin(auth.uid())
    or (
      public.same_school(p_school_id)
      and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'directeur'))
    )
  ) then
    raise exception 'Accès refusé : vous ne pouvez pas modifier cet abonnement';
  end if;

  select * into v_plan from public.subscription_plans
    where id = p_new_plan_id and is_active = true;
  if not found then
    raise exception 'Offre introuvable ou inactive';
  end if;

  select plan_id into v_prev_plan from public.school_subscriptions where school_id = p_school_id;

  if p_billing_cycle = 'yearly' then
    v_end := v_start + interval '1 year';
    v_amount := v_plan.price_yearly;
  else
    v_end := v_start + interval '1 month';
    v_amount := v_plan.price_monthly;
  end if;

  insert into public.school_subscriptions as s (
    school_id, plan_id, status, billing_cycle,
    current_period_start, current_period_end,
    last_payment_at, last_payment_amount, metadata
  ) values (
    p_school_id, p_new_plan_id, 'active', p_billing_cycle,
    v_start, v_end, v_start, v_amount,
    jsonb_build_object('source','self-service','action','renew_or_change')
  )
  on conflict (school_id) do update set
    plan_id = excluded.plan_id,
    status = 'active',
    billing_cycle = excluded.billing_cycle,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    last_payment_at = excluded.last_payment_at,
    last_payment_amount = excluded.last_payment_amount,
    metadata = s.metadata || excluded.metadata,
    updated_at = now()
  returning * into v_row;

  insert into public.subscription_history (
    school_id, previous_plan_id, new_plan_id, action, billing_cycle,
    amount, currency, period_start, period_end, status, performed_by
  ) values (
    p_school_id, v_prev_plan, p_new_plan_id,
    case when v_prev_plan is null then 'subscribe'
         when v_prev_plan = p_new_plan_id then 'renew'
         else 'change_plan' end,
    p_billing_cycle, v_amount, coalesce(v_plan.currency,'GNF'),
    v_start, v_end, 'active', auth.uid()
  );

  return v_row;
end;
$$;

revoke all on function public.renew_or_change_subscription(uuid, uuid, text) from public, anon;
grant execute on function public.renew_or_change_subscription(uuid, uuid, text) to authenticated;