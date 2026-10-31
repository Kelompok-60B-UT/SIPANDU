# SIPANDU

A modern, full-stack Next.js application built with **Tailwind CSS**, **Supabase SSR**, and configured for **Vercel** deployment.

---

## ⚡ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, Server Actions)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend / Database / Auth**: [Supabase](https://supabase.com/) (`@supabase/ssr` & `@supabase/supabase-js`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 📁 Project Structure

```text
├── public/                 # Static assets
├── src/
│   ├── app/
│   │   ├── actions/        # Server actions (auth login, signup, signOut)
│   │   ├── auth/           # OAuth / callback handlers & error routes
│   │   ├── login/          # Authentication page (login & register)
│   │   ├── layout.tsx      # Root application layout
│   │   └── page.tsx        # Homepage dashboard & status overview
│   ├── proxy.ts            # Next.js proxy (session refresh & middleware)
│   └── utils/
│       └── supabase/
│           ├── client.ts   # Browser Supabase client (Client Components)
│           ├── server.ts   # Async server Supabase client (Server Components & Actions)
│           └── middleware.ts # Supabase session handler for proxy
├── .env.example            # Environment variables template
├── .env.local              # Local environment variables (git-ignored)
├── vercel.json             # Vercel deployment configuration
└── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- A [Supabase](https://supabase.com/) account and project

### 2. Environment Variables Setup
Copy `.env.example` to `.env.local` if you haven't already:

```bash
cp .env.example .env.local
```

Fill in your project credentials from the **Supabase Dashboard** (`Project Settings -> API`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Supabase Usage Examples

### Server Component / Server Action
```tsx
import { createClient } from '@/utils/supabase/server'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <div>Welcome, {user?.email}</div>
}
```

### Client Component
```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function RealtimeData() {
  const [data, setData] = useState([])
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from('items').select()
      setData(data ?? [])
    }
    loadData()
  }, [])

  return <div>Items: {data.length}</div>
}
```

---

## 🌐 Deploying to Vercel

1. Push your code to your GitHub/GitLab/Bitbucket repository.
2. Import the project in the [Vercel Dashboard](https://vercel.com/new).
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel will automatically build and deploy your application.

---

## 🛠 Available Scripts

- `npm run dev`: Starts the Next.js development server with Turbopack.
- `npm run build`: Builds the production application.
- `npm run start`: Runs the built production application.
- `npm run lint`: Runs ESLint checks.
