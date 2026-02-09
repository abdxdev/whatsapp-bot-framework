import { AppSidebar } from "@/components/app-sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col w-full h-svh">
        <header className="flex shrink-0 items-center gap-2 p-4 border-b bg-background z-30">
          <DashboardBreadcrumb className="flex-1" />
          <SidebarTrigger className="md:hidden ml-auto" />
        </header>
        <div className="flex flex-1 min-h-0">
          <AppSidebar user={user} />
          <SidebarInset className="overflow-y-auto">
            <div className="mx-auto max-w-6xl flex-1 w-full mt-4 px-4 space-y-4">{children}</div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
