import { createClient } from "@/lib/supabase/server";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { PageHeader } from "@/components/page-header";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PageHeader title="Account Settings" description="Manage your profile and preferences" />
      <AccountSettingsForm user={user} />
    </>
  );
}
