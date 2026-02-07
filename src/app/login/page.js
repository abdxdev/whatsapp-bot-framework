import GoogleSignIn from "@/components/signin";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex w-full max-w-md flex-col items-center justify-center gap-8 p-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-2">Welcome</h1>
                    <p className="text-gray-600 dark:text-gray-400">Sign in to continue</p>
                </div>
                <GoogleSignIn />
            </main>
        </div>
    );
}
