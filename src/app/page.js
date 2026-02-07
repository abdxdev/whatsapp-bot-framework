import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import SignOutButton from "@/components/signout";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 p-8">
        {user && (
          <div className="flex flex-col items-center gap-6 p-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700">
              <Image
                src={user.user_metadata?.avatar_url || '/placeholder-avatar.png'}
                alt={user.user_metadata?.full_name || 'User'}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-1">
                {user.user_metadata?.full_name || 'User'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {user.email}
              </p>
            </div>
            <SignOutButton />
          </div>
        )}
      </main>
    </div>
  );
}
