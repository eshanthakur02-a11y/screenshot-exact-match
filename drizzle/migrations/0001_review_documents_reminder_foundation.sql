ALTER TABLE public.profiles ADD COLUMN reminders_enabled boolean NOT NULL DEFAULT true, ADD COLUMN reminder_days_before integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD CONSTRAINT reminder_days_before_valid CHECK (reminder_days_before BETWEEN 0 AND 7);
ALTER TABLE public.tasks ADD COLUMN import_key text;
CREATE UNIQUE INDEX tasks_import_key_unique ON public.tasks(user_id, import_key) WHERE import_key IS NOT NULL;
CREATE TABLE public.documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL, content text NOT NULL, content_hash text NOT NULL, storage_path text, reference_date date, candidates jsonb, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, content_hash));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_owner ON public.documents FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE INDEX documents_owner_created ON public.documents(user_id,created_at DESC);
CREATE POLICY source_documents_owner ON storage.objects FOR ALL TO authenticated USING(bucket_id='source-documents' AND (storage.foldername(name))[1]=auth.uid()::text) WITH CHECK(bucket_id='source-documents' AND (storage.foldername(name))[1]=auth.uid()::text);
ALTER TABLE public.notifications ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE, ADD COLUMN reminder_event text, ADD COLUMN deadline_day date;
CREATE TABLE public.reminder_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, deadline_day date NOT NULL, event text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,task_id,deadline_day,event));
GRANT SELECT ON public.reminder_events TO authenticated;
GRANT ALL ON public.reminder_events TO service_role;
ALTER TABLE public.reminder_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY reminder_events_owner ON public.reminder_events FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE OR REPLACE FUNCTION public.process_task_reminders() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE added integer;
BEGIN
IF NOT pg_try_advisory_xact_lock(7801028) THEN RETURN 0; END IF;
WITH eligible AS (
SELECT t.id,t.user_id,t.title,(t.due_date AT TIME ZONE 'UTC')::date AS deadline,
CASE WHEN (now() AT TIME ZONE p.timezone)::date > (t.due_date AT TIME ZONE 'UTC')::date THEN 'overdue' ELSE 'upcoming' END AS event
FROM public.tasks t JOIN public.profiles p ON p.id=t.user_id
WHERE p.reminders_enabled AND t.status<>'done' AND t.due_date IS NOT NULL
AND (now() AT TIME ZONE p.timezone)::date >= (t.due_date AT TIME ZONE 'UTC')::date-p.reminder_days_before
ORDER BY t.due_date,t.id LIMIT 500
), fresh AS (
INSERT INTO public.reminder_events(user_id,task_id,deadline_day,event)
SELECT user_id,id,deadline,event FROM eligible ON CONFLICT DO NOTHING RETURNING *
)
INSERT INTO public.notifications(user_id,task_id,deadline_day,reminder_event,title,body)
SELECT f.user_id,f.task_id,f.deadline_day,f.event,CASE WHEN f.event='overdue' THEN 'Overdue: ' ELSE 'Due soon: ' END || t.title,'Deadline: '||f.deadline_day::text FROM fresh f JOIN public.tasks t ON t.id=f.task_id;
GET DIAGNOSTICS added=ROW_COUNT;
RETURN added;
END; $$;
REVOKE ALL ON FUNCTION public.process_task_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_task_reminders() TO service_role;
CREATE OR REPLACE FUNCTION public.invalidate_task_reminders() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NEW.status='done' OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
DELETE FROM public.notifications WHERE task_id=NEW.id AND reminder_event IS NOT NULL;
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER task_reminder_invalidation AFTER UPDATE OF status,due_date ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.invalidate_task_reminders();
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;