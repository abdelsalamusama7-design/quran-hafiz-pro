-- Create shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create family_groups table
CREATE TABLE public.family_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'child' CHECK (role IN ('parent', 'child')),
  display_name TEXT NOT NULL,
  age INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);

CREATE TABLE public.child_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_user_id UUID NOT NULL,
  family_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  surah_number INTEGER,
  verses_count INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.parent_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  child_user_id UUID NOT NULL,
  parent_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_verses INTEGER DEFAULT 0,
  target_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  reward TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_goals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_family_member(_family_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.family_members WHERE family_id = _family_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_family_parent(_family_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.family_groups WHERE id = _family_id AND parent_id = _user_id);
$$;

CREATE POLICY "Members can view their family" ON public.family_groups FOR SELECT TO authenticated
USING (public.is_family_member(id, auth.uid()) OR parent_id = auth.uid());
CREATE POLICY "Authenticated can create family" ON public.family_groups FOR INSERT TO authenticated
WITH CHECK (parent_id = auth.uid());
CREATE POLICY "Parent can update family" ON public.family_groups FOR UPDATE TO authenticated
USING (parent_id = auth.uid());
CREATE POLICY "Parent can delete family" ON public.family_groups FOR DELETE TO authenticated
USING (parent_id = auth.uid());

CREATE POLICY "Members can view family members" ON public.family_members FOR SELECT TO authenticated
USING (public.is_family_member(family_id, auth.uid()) OR public.is_family_parent(family_id, auth.uid()));
CREATE POLICY "Users can join family" ON public.family_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Parent or self can remove" ON public.family_members FOR DELETE TO authenticated
USING (public.is_family_parent(family_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Family can view activity logs" ON public.child_activity_logs FOR SELECT TO authenticated
USING (public.is_family_member(family_id, auth.uid()) OR public.is_family_parent(family_id, auth.uid()));
CREATE POLICY "Child can create own logs" ON public.child_activity_logs FOR INSERT TO authenticated
WITH CHECK (child_user_id = auth.uid());

CREATE POLICY "Family can view goals" ON public.parent_goals FOR SELECT TO authenticated
USING (public.is_family_member(family_id, auth.uid()) OR public.is_family_parent(family_id, auth.uid()));
CREATE POLICY "Parent can create goals" ON public.parent_goals FOR INSERT TO authenticated
WITH CHECK (parent_user_id = auth.uid() AND public.is_family_parent(family_id, auth.uid()));
CREATE POLICY "Parent can update goals" ON public.parent_goals FOR UPDATE TO authenticated
USING (parent_user_id = auth.uid());
CREATE POLICY "Child can mark goal complete" ON public.parent_goals FOR UPDATE TO authenticated
USING (child_user_id = auth.uid());
CREATE POLICY "Parent can delete goals" ON public.parent_goals FOR DELETE TO authenticated
USING (parent_user_id = auth.uid());

CREATE TRIGGER update_family_groups_updated_at
BEFORE UPDATE ON public.family_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();