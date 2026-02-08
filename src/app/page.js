import Link from "next/link";
import { Files, User, Box, FileText, Info, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/signout-button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="min-h-screen p-4 md:p-6 flex items-center justify-center">
      <header className="relative">
        <div className="container mx-auto px-4">
          <nav className="px-0 py-4">
            <div className="relative flex items-center">
              <Link href="/" className="flex items-center gap-2 text-lg font-bold">
                <Logo className="size-6 text-primary" />
                Whatsapp Bot Framework
              </Link>
              <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
                <ul className="mt-4 flex flex-col gap-1 lg:mt-0 lg:flex-row lg:items-center lg:gap-1">
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                      <Files className="h-4 w-4" />
                      Pages
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                      <User className="h-4 w-4" />
                      Account
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                      <Box className="h-4 w-4" />
                      Blocks
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                      <FileText className="h-4 w-4" />
                      Docs
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="ml-auto hidden items-center gap-2 lg:flex">
                {user ? (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                    <SignOutButton />
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/login">Sign In</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/signup">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
              <Button variant="ghost" size="sm" className="ml-auto grid lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </nav>
        </div>
        <div className="container mx-auto px-4 py-12 md:py-20 lg:py-28">
          <div className="mb-16 text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Exciting News! Introducing our latest innovation
            </Badge>
            <h1 className="mx-auto mb-6 max-w-4xl scroll-m-20 text-center text-4xl leading-tight! font-bold tracking-tight text-balance md:text-5xl lg:text-6xl">
              Get ready to experience a new level of <span className="text-primary">performance</span> and <span className="text-primary">functionality</span>.
            </h1>
            <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-center text-base leading-relaxed md:text-lg lg:text-xl">
              The time is now for it to be okay to be great. For being a bright color. For standing out.
            </p>
            <form className="mx-auto w-full max-w-lg" action="#">
              <div className="flex w-full flex-col items-center gap-3 sm:flex-row">
                <Input type="email" id="email" placeholder="someone@example.com" className="h-11 w-full" />
                <Button type="submit" size="lg" className="w-full shrink-0 sm:w-auto">
                  Get Started
                </Button>
              </div>
            </form>
          </div>
          <div className="relative h-[40vh] w-full overflow-hidden rounded-2xl shadow-2xl sm:h-[50vh] md:h-[60vh] lg:h-[70vh]">
            <img
              alt="Modern architecture and design"
              className="h-full w-full object-cover object-center"
              height="800"
              src="https://images.unsplash.com/photo-1573588028698-f4759befb09a?auto=format&w=2000&q=85"
              width="1200"
            />
          </div>
        </div>
      </header>
    </main>
  );
}
