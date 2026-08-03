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

  return v_row;
end;
$$;

revoke all on function public.renew_or_change_subscription(uuid, uuid, text) from public, anon;
grant execute on function public.renew_or_change_subscription(uuid, uuid, text) to authenticated;