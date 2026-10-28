import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function NotificationUpdates({ userId }: { userId: string }) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["notifications"] });
          void qc.invalidateQueries({ queryKey: ["shell"] });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void qc.invalidateQueries({ queryKey: ["notifications"] });
          void qc.invalidateQueries({ queryKey: ["shell"] });
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, userId]);
  return null;
}
