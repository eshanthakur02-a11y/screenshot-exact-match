import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
export function WorkspaceNavigation() {
  return <Link to="/documents" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><FileText className="size-4" />Documents</Link>;
}