"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button onClick={handleSignOut} className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
      Sign Out
    </button>
  );
}
