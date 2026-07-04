import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/ui/Icon";
import { UserManager } from "@/components/settings/UserManager";
import { ProfileAvatar } from "@/components/settings/ProfileAvatar";
import { AccountDetails } from "@/components/settings/AccountDetails";
import { ChangePassword } from "@/components/settings/ChangePassword";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";

  // The session/JWT doesn't carry the photo, so read it from the DB.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { image: true },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Settings</h2>
        <p className="text-sm font-medium text-gray-500">Manage your account, security and team access.</p>
      </div>

      {/* Account card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-gray-900">Your Account</h3>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <AccountDetails initialName={user.name} initialEmail={user.email} role={user.role} />
          <ProfileAvatar name={user.name} initialImage={dbUser?.image ?? ""} />
        </div>
      </div>

      {/* Password / security */}
      <ChangePassword />

      {/* Team management — admins only */}
      {isAdmin ? (
        <UserManager currentUserId={user.id} />
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
          <Icon name="settings" size={18} className="text-gray-300" />
          Only admins can add or manage team members. Contact an administrator if you
          need access changes.
        </div>
      )}
    </div>
  );
}
