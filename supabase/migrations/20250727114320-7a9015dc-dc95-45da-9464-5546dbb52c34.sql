-- Create trigger to automatically log assistance creation
CREATE OR REPLACE FUNCTION log_assistance_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (
    assistance_id,
    action,
    details,
    metadata
  ) VALUES (
    NEW.id,
    'assistance_created',
    'Nova assistência criada: ' || NEW.title,
    jsonb_build_object(
      'priority', NEW.priority,
      'building_id', NEW.building_id,
      'assigned_supplier_id', NEW.assigned_supplier_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for assistance creation
CREATE TRIGGER trigger_log_assistance_creation
  AFTER INSERT ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION log_assistance_creation();

-- Create trigger to log status changes
CREATE OR REPLACE FUNCTION log_assistance_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_log (
      assistance_id,
      action,
      details,
      metadata
    ) VALUES (
      NEW.id,
      'status_changed',
      'Status alterado de ' || COALESCE(OLD.status::text, 'null') || ' para ' || NEW.status::text,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
  END IF;
  
  IF OLD.assigned_supplier_id IS DISTINCT FROM NEW.assigned_supplier_id THEN
    INSERT INTO public.activity_log (
      assistance_id,
      supplier_id,
      action,
      details,
      metadata
    ) VALUES (
      NEW.id,
      NEW.assigned_supplier_id,
      'supplier_assigned',
      CASE 
        WHEN NEW.assigned_supplier_id IS NULL THEN 'Fornecedor removido'
        ELSE 'Fornecedor atribuído'
      END,
      jsonb_build_object(
        'old_supplier_id', OLD.assigned_supplier_id,
        'new_supplier_id', NEW.assigned_supplier_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status changes
CREATE TRIGGER trigger_log_assistance_changes
  AFTER UPDATE ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION log_assistance_status_change();

-- Create trigger to log supplier responses
CREATE OR REPLACE FUNCTION log_supplier_response()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (
    assistance_id,
    supplier_id,
    action,
    details,
    metadata
  ) VALUES (
    NEW.assistance_id,
    NEW.supplier_id,
    'supplier_response',
    CASE 
      WHEN NEW.response_type = 'accepted' THEN 'Fornecedor aceitou a assistência'
      WHEN NEW.response_type = 'declined' THEN 'Fornecedor recusou a assistência'
      ELSE 'Fornecedor respondeu à assistência'
    END,
    jsonb_build_object(
      'response_type', NEW.response_type,
      'decline_reason', NEW.decline_reason,
      'estimated_completion_date', NEW.estimated_completion_date,
      'notes', NEW.notes
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for supplier responses
CREATE TRIGGER trigger_log_supplier_response
  AFTER INSERT OR UPDATE ON public.supplier_responses
  FOR EACH ROW
  EXECUTE FUNCTION log_supplier_response();