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
AND NOT EXISTS (SELECT 1 FROM public.reminder_events r WHERE r.task_id=t.id AND r.user_id=t.user_id AND r.deadline_day=(t.due_date AT TIME ZONE 'UTC')::date AND r.event=CASE WHEN (now() AT TIME ZONE p.timezone)::date > (t.due_date AT TIME ZONE 'UTC')::date THEN 'overdue' ELSE 'upcoming' END)
ORDER BY t.due_date,t.id LIMIT 500 FOR UPDATE OF t
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