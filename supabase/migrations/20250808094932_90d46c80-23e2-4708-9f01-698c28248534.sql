
-- 1) Ler mensagens por código (bypass seguro de RLS via SECURITY DEFINER)
create or replace function public.get_communications_for_code(
  p_magic_code text,
  p_assistance_id uuid
)
returns table (
  id uuid,
  assistance_id uuid,
  sender_type text,
  sender_id uuid,
  message_type text,
  message text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  code_record record;
  allowed boolean := false;
begin
  -- Obter registo do código (mais recente se houver duplicados)
  select * into code_record
  from public.supplier_magic_codes
  where magic_code = p_magic_code
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'invalid_magic_code';
  end if;

  -- Expiração com período de graça de 24h (igual ao validate_supplier_session)
  if code_record.expires_at <= now() then
    if code_record.expires_at > (now() - interval '24 hours') then
      update public.supplier_magic_codes
      set expires_at = now() + interval '24 hours'
      where id = code_record.id;
    else
      raise exception 'expired_magic_code';
    end if;
  end if;

  -- Verificar que a assistência é do fornecedor do código (atribuída ou ligada ao próprio código)
  select exists (
    select 1
    from public.assistances a
    where a.id = p_assistance_id
      and (a.assigned_supplier_id = code_record.supplier_id
           or a.id = code_record.assistance_id)
  ) into allowed;

  if not allowed then
    raise exception 'not_allowed';
  end if;

  return query
  select c.id, c.assistance_id, c.sender_type, c.sender_id, c.message_type, c.message, c.created_at
  from public.communications_log c
  where c.assistance_id = p_assistance_id
  order by c.created_at asc;
end;
$$;

-- 2) Criar mensagem por código (força sender_id do fornecedor no servidor e regista acesso)
create or replace function public.create_communication_via_code(
  p_magic_code text,
  p_assistance_id uuid,
  p_message text,
  p_message_type text default 'general'
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  code_record record;
  allowed boolean := false;
  new_row public.communications_log%rowtype;
begin
  if coalesce(trim(p_message), '') = '' then
    return jsonb_build_object('success', false, 'error', 'empty_message');
  end if;

  select * into code_record
  from public.supplier_magic_codes
  where magic_code = p_magic_code
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'invalid_magic_code');
  end if;

  -- Expiração com período de graça de 24h
  if code_record.expires_at <= now() then
    if code_record.expires_at > (now() - interval '24 hours') then
      update public.supplier_magic_codes
      set expires_at = now() + interval '24 hours'
      where id = code_record.id;
    else
      return jsonb_build_object('success', false, 'error', 'expired_magic_code');
    end if;
  end if;

  -- Verificar elegibilidade da assistência
  select exists (
    select 1
    from public.assistances a
    where a.id = p_assistance_id
      and (a.assigned_supplier_id = code_record.supplier_id
           or a.id = code_record.assistance_id)
  ) into allowed;

  if not allowed then
    return jsonb_build_object('success', false, 'error', 'not_allowed');
  end if;

  insert into public.communications_log(
    assistance_id, sender_type, sender_id, message_type, message
  ) values (
    p_assistance_id, 'supplier', code_record.supplier_id, coalesce(p_message_type, 'general'), p_message
  )
  returning * into new_row;

  perform public.log_supplier_access(
    code_record.supplier_id,
    p_magic_code,
    'create_communication',
    true,
    jsonb_build_object('assistance_id', p_assistance_id)
  );

  return jsonb_build_object('success', true, 'communication', to_jsonb(new_row));
end;
$$;

-- 3) Índice recomendado para performance na listagem de mensagens
create index if not exists idx_communications_log_assistance_created
  on public.communications_log(assistance_id, created_at);
