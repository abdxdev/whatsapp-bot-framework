import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <Logo className="size-6 text-primary" />
            Whatsapp Bot Framework
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img src="/bg-light.jpg" alt="Background" className="absolute inset-0 h-full w-full object-cover dark:hidden" />
        <img src="/bg-dark.jpg" alt="Background" className="absolute inset-0 h-full w-full object-cover hidden dark:block" />
      </div>
    </div>
  );
}
