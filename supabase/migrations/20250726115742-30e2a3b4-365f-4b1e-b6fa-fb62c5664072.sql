-- Create enum types for better data integrity
CREATE TYPE public.assistance_status AS ENUM (
  'pending', 'sent_to_suppliers', 'quotes_received', 'quote_approved', 
  'scheduled', 'in_progress', 'awaiting_approval', 'completed', 'cancelled'
);

CREATE TYPE public.assistance_priority AS ENUM ('normal', 'urgent', 'critical');

CREATE TYPE public.quotation_status AS ENUM ('pending', 'submitted', 'approved', 'rejected', 'expired');

CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'supplier');

-- Buildings table with real data structure
CREATE TABLE public.buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  nif TEXT,
  cadastral_code TEXT,
  admin_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Suppliers table with real data structure
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  nif TEXT,
  specialization TEXT,
  admin_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating DECIMAL(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Intervention types table
CREATE TABLE public.intervention_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  urgency_level assistance_priority NOT NULL DEFAULT 'normal',
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table for RBAC
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Supplier magic codes for secure access
CREATE TABLE public.supplier_magic_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  magic_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  assistance_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Main assistances table
CREATE TABLE public.assistances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID REFERENCES public.buildings(id) NOT NULL,
  intervention_type_id UUID REFERENCES public.intervention_types(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status assistance_status NOT NULL DEFAULT 'pending',
  priority assistance_priority NOT NULL DEFAULT 'normal',
  created_by UUID REFERENCES auth.users(id),
  assigned_supplier_id UUID REFERENCES public.suppliers(id),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  admin_notes TEXT,
  supplier_notes TEXT,
  deadline_response TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quotations table for multiple quotes per assistance
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistance_id UUID REFERENCES public.assistances(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  validity_days INTEGER DEFAULT 30,
  status quotation_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assistance photos table
CREATE TABLE public.assistance_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistance_id UUID REFERENCES public.assistances(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  photo_type TEXT NOT NULL, -- 'initial', 'progress', 'completion'
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_supplier UUID REFERENCES public.suppliers(id),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email logs for legal compliance
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistance_id UUID REFERENCES public.assistances(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_used TEXT,
  status TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_content TEXT,
  metadata JSONB
);

-- Activity log for audit trail
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistance_id UUID REFERENCES public.assistances(id),
  user_id UUID REFERENCES auth.users(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  action TEXT NOT NULL,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Communications log
CREATE TABLE public.communications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistance_id UUID REFERENCES public.assistances(id) NOT NULL,
  sender_type TEXT NOT NULL, -- 'admin', 'supplier'
  sender_id UUID, -- user_id or supplier_id
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'general', -- 'general', 'quote', 'update', 'completion'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_magic_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistance_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications_log ENABLE ROW LEVEL SECURITY;

-- Create security definer function for checking user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function for checking if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- RLS Policies for buildings
CREATE POLICY "Authenticated users can view buildings" 
ON public.buildings 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage buildings" 
ON public.buildings 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for suppliers
CREATE POLICY "Authenticated users can view active suppliers" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage suppliers" 
ON public.suppliers 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for intervention types
CREATE POLICY "Everyone can view intervention types" 
ON public.intervention_types 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage intervention types" 
ON public.intervention_types 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for user roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for assistances
CREATE POLICY "Authenticated users can view assistances" 
ON public.assistances 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage assistances" 
ON public.assistances 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for quotations
CREATE POLICY "Authenticated users can view quotations" 
ON public.quotations 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage quotations" 
ON public.quotations 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for other tables (similar pattern)
CREATE POLICY "Authenticated users can view assistance photos" 
ON public.assistance_photos 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage assistance photos" 
ON public.assistance_photos 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view email logs" 
ON public.email_logs 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view activity log" 
ON public.activity_log 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view communications" 
ON public.communications_log 
FOR SELECT 
TO authenticated
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assistances_updated_at
  BEFORE UPDATE ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Give admin role to first user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to generate magic codes
CREATE OR REPLACE FUNCTION public.generate_magic_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    -- Generate 6 character alphanumeric code
    code := upper(substr(md5(random()::text), 1, 6));
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM public.supplier_magic_codes 
      WHERE magic_code = code AND expires_at > now()
    ) INTO exists_code;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_code;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_buildings_code ON public.buildings(code);
CREATE INDEX idx_buildings_active ON public.buildings(is_active);
CREATE INDEX idx_suppliers_active ON public.suppliers(is_active);
CREATE INDEX idx_suppliers_specialization ON public.suppliers(specialization);
CREATE INDEX idx_assistances_status ON public.assistances(status);
CREATE INDEX idx_assistances_building ON public.assistances(building_id);
CREATE INDEX idx_assistances_supplier ON public.assistances(assigned_supplier_id);
CREATE INDEX idx_quotations_assistance ON public.quotations(assistance_id);
CREATE INDEX idx_quotations_supplier ON public.quotations(supplier_id);
CREATE INDEX idx_magic_codes_code ON public.supplier_magic_codes(magic_code);
CREATE INDEX idx_magic_codes_expires ON public.supplier_magic_codes(expires_at);
CREATE INDEX idx_activity_log_assistance ON public.activity_log(assistance_id);
CREATE INDEX idx_email_logs_assistance ON public.email_logs(assistance_id);