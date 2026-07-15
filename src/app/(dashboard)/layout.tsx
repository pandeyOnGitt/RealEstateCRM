import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar user={user} />
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl pb-24 md:pb-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
