# Whatsapp Bot Framework

A production-ready Next.js starter template with **Supabase authentication**, **shadcn/ui components**, and **dark mode support** — everything you need to start building a full-stack app with a polished UI and secure auth out of the box.

## Features

- **Authentication** — Email/password sign-up & login, Google OAuth, forgot/reset password flows
- **Route Protection** — Middleware-based auth guard redirects unauthenticated users away from protected routes
- **Dashboard** — Sidebar layout with user profile, account status, and navigation (powered by shadcn sidebar)
- **Account Settings** — Update display name and avatar (uploaded to Supabase Storage)
- **Dark Mode** — System-aware theme toggle with seamless light/dark switching
- **Server & Client Supabase Clients** — Pre-configured helpers for both Server Components and Client Components
- **shadcn/ui Components**

## Project Structure

```
src/
├── app/
│   ├── layout.js              # Root layout with ThemeProvider & Geist fonts
│   ├── page.js                # Landing / home page
│   ├── auth/callback/route.js # OAuth callback handler
│   ├── dashboard/page.jsx     # Protected dashboard with sidebar
│   ├── dashboard/settings/page.jsx # Account settings (name & avatar)
│   ├── login/page.jsx         # Login page
│   ├── signup/page.jsx        # Sign-up page
│   ├── forgot-password/page.jsx
│   └── reset-password/page.jsx
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   ├── app-sidebar.jsx        # Dashboard sidebar
│   ├── login-form.jsx         # Login form (email + Google OAuth)
│   ├── signup-form.jsx        # Sign-up form
│   ├── forgot-password-form.jsx
│   ├── reset-password-form.jsx
│   ├── account-settings-form.jsx # Avatar upload & name change
│   ├── mode-toggle.jsx        # Dark / light mode switch
│   └── ...
├── lib/
│   └── supabase/
│       ├── client.js          # Browser client (createBrowserClient)
│       ├── server.js          # Server client (createServerClient + cookies)
│       └── proxy.js           # Middleware session handler
└── hooks/
    └── use-mobile.js          # Responsive breakpoint hook
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd whatsapp-bot-framework
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

> You can find these values in your Supabase project's **Settings → API**.

### 3. Set Up Supabase Auth (Optional: Google OAuth)

1. In your Supabase dashboard, go to **Authentication → Providers**.
2. Enable **Google** and add your OAuth credentials.
3. Add `http://localhost:3000/auth/callback` to the **Redirect URLs** in **Authentication → URL Configuration**.

### 4. Set Up Supabase Storage (Avatars)

1. In your Supabase dashboard, go to **Storage** and create a new public bucket called `avatars`.
2. Add an **RLS policy** that allows authenticated users to upload to their own folder (e.g., `uid() || '/%'`).

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Create production build  |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

## Customization

### Adding shadcn/ui Components

This project uses the **shadcn CLI** (configured in `components.json` with the **New York** style and **JSX**):

```bash
npx shadcn@latest add <component-name>
```

### Changing the Theme

Edit CSS variables in `src/app/globals.css` to customize colors, border radius, and other design tokens.

### Adding Protected Routes

Add paths to the `publicRoutes` array in `src/lib/supabase/proxy.js`. Any route **not** in that list is automatically protected by the middleware.

## Deployment

Deploy to any platform that supports Next.js:

- **[Vercel](https://vercel.com)** — Zero-config deployment (recommended)
- **[Netlify](https://netlify.com)** — With the Next.js adapter
- **Self-hosted** — `npm run build && npm run start`

Make sure to set the environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) in your hosting provider's dashboard.

## License

MIT
