/**
 * Dashboard layout.
 * AuthGuard and sidebar are handled by the parent (protected) layout.
 * This provides dashboard-specific content structure.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
