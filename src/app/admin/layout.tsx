import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import { LayoutDashboard, Users, ExternalLink, ShieldAlert } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg === "Unauthorized" || msg === "ADMIN_EMAIL not configured") {
      redirect("/");
    }
    throw err;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] font-mono">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-52 shrink-0 border-r border-[#1e1e1e] flex flex-col bg-[#0d0d0d]">
          <div className="px-4 py-4 border-b border-[#1e1e1e]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">
                Admin
              </span>
            </div>
            <p className="text-[10px] text-[#555] mt-0.5 tracking-wide">
              Expandcast Control
            </p>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-0.5">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded text-[#999] hover:text-[#e8e8e8] hover:bg-[#161616] text-xs transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-2.5 px-3 py-2 rounded text-[#999] hover:text-[#e8e8e8] hover:bg-[#161616] text-xs transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              Users
            </Link>
          </nav>

          <div className="px-4 py-3 border-t border-[#1e1e1e]">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[10px] text-[#555] hover:text-[#999] transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Back to app
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
