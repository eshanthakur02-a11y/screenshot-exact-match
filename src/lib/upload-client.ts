import { supabase } from "@/integrations/supabase/client";
export async function authenticatedUpload(path: string, form: FormData) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sign in before uploading.");
  return fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    body: form,
  });
}
