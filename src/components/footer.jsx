import Link from "next/link";
import { ArrowRight, Facebook, Twitter, Linkedin, Instagram, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Docs", href: "/docs" },
      { label: "Developers", href: "/developers" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Pricing", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "#" },
      { label: "Contact", href: "/support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms-of-services" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ],
  },
];

const socialLinks = [
  { label: "Facebook", href: "https://facebook.com", icon: Facebook },
  { label: "Twitter", href: "https://twitter.com", icon: Twitter },
  { label: "LinkedIn", href: "https://linkedin.com", icon: Linkedin },
  { label: "Instagram", href: "https://instagram.com", icon: Instagram },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
        {/* CTA Section */}
        <div className="mb-16 rounded-2xl bg-primary-foreground/5 p-8 backdrop-blur-sm md:p-12 lg:p-16">
          <div className="flex flex-col items-center text-center">
            <h2 className="max-w-[800px] text-4xl leading-tight font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl">
              Start your free trial today.{" "}
              <span className="relative inline-block text-primary-foreground/60">
                Your future won&apos;t wait.
                <span className="absolute bottom-1 left-0 h-1 w-full rounded-full bg-primary-foreground/30" />
              </span>
            </h2>
            <p className="mt-4 max-w-[600px] text-lg text-primary-foreground/80">Join thousands of users already leveraging our platform to achieve more.</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button variant="secondary" size="lg" asChild className="group">
                <Link href="/auth/signup">
                  Get started with 7 days free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mb-14 border-b border-primary-foreground/20 pb-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-2xl font-medium">Stay connected</h3>
              <p className="max-w-md text-primary-foreground/70">Subscribe to our newsletter for the latest updates, resources, and exclusive offers.</p>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row">             
              
              <div className="relative grow">
                <Mail className="absolute h-4 w-4 text-primary-foreground/50" />
                <Input type="email" placeholder="Your email address" className="h-12 border-primary-foreground/20 bg-primary-foreground/10 pl-10 text-primary-foreground placeholder:text-primary-foreground/50" />
              </div>
              <Button type="submit" variant="secondary" className="h-12 px-6">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="grid grid-cols-2 gap-x-6 gap-y-10 border-b border-primary-foreground/20 py-10 sm:grid-cols-4 lg:py-16">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="mb-5 text-lg font-semibold">{group.title}</h3>
              <ul className="space-y-4">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="inline-block text-primary-foreground/80 transition-colors duration-200 hover:text-primary-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom Bar */}
        <div className="mx-auto mt-4 py-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2 font-medium text-primary-foreground/80">
              <Logo variant="color" className="size-5" />
              <span>© 2026 Whatsapp Bot Framework</span>
            </div>
            <div className="flex items-center gap-6">
              {socialLinks.map((social) => (
                <a key={social.label} aria-label={social.label} href={social.href} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
