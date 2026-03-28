# BudzetApp

Inteligentna aplikacja budżetowa z rozpoznawaniem paragonów (OCR via Claude Vision API).

## Stack

- **Frontend:** Next.js 15.3, React 19, TypeScript (strict), Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL 17, Auth, Storage, RLS)
- **Hosting:** Vercel (auto-deploy z main), Node 24.x
- **Inne:** Recharts, Zustand, ExcelJS, lucide-react, @anthropic-ai/sdk

## Struktura projektu

```
src/
├── app/
│   ├── api/
│   │   ├── export/route.ts      # Excel export (GET, ExcelJS)
│   │   └── ocr/route.ts         # OCR paragonów (POST, Claude Vision)
│   ├── auth/callback/route.ts   # OAuth callback
│   ├── dashboard/               # Chronione strony (wymagają auth)
│   │   ├── layout.tsx           # Sidebar + nawigacja
│   │   ├── page.tsx             # Dashboard
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── documents/
│   │   ├── month/[year]/[month]/
│   │   ├── year/[year]/
│   │   ├── scan/
│   │   └── settings/
│   ├── login/
│   ├── register/
│   └── middleware.ts            # Auth guard
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # createBrowserClient
│   │   ├── server.ts            # createServerClient (cookies)
│   │   └── middleware.ts        # updateSession()
│   ├── actions/                 # Server actions ('use server')
│   │   ├── accounts.ts
│   │   ├── budgets.ts
│   │   ├── categories.ts
│   │   ├── documents.ts
│   │   ├── settings.ts
│   │   ├── transactions.ts
│   │   └── year-summary.ts
│   └── categories.ts           # Domyślne szablony kategorii
└── types/
    └── budget.ts               # Typy i interfejsy
```

## Baza danych (Supabase)

Projekt ID: `xwdjfuttrhqahmipnkiu` (eu-west-1)

### Tabele (wszystkie z RLS)

- **profiles** — użytkownicy (display_name, avatar_url, default_currency=PLN)
- **budget_settings** — ustawienia (current_year, start_day_of_month, show_business)
- **budgets** — budżety miesięczne (year, month, budget_type: home|business)
- **categories** — kategorie hierarchiczne (type: income|expense|savings, parent_id, icon)
- **planned_amounts** — planowane kwoty per kategoria per budżet
- **transactions** — transakcje (amount, date, description, document_id)
- **accounts** — konta (cash|checking|savings|investment)
- **account_balances** — salda kont per miesiąc/rok
- **documents** — dokumenty/paragony z OCR (file_path, ocr_vendor_name, ocr_total, ocr_date, status: pending|processed|error)

## Wzorce kodu

### Server actions
Każda akcja: weryfikacja auth → query Supabase → obsługa błędów → typowany return.

### Komponenty
- Client Components (`'use client'`) — strony z interakcją, formularze, wykresy
- Ciemny motyw: bg `#0a0a0a`/`#141418`, akcent `#6c5ce7`→`#a29bfe`
- Ikony: lucide-react
- Wykresy: recharts (AreaChart, BarChart)
- Responsywność: mobile-first, bottom nav na mobile, sidebar na desktop

### Język UI
Cały interfejs po polsku, włącznie z komunikatami błędów i szablonami kategorii.

## Zmienne środowiskowe

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
DATABASE_URL
NODE_ENV
```

## Komendy

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production
npm run lint     # ESLint
```

## Deployment

- **Vercel:** budzetapp.vercel.app — auto-deploy z `main` branch
- **GitHub:** github.com/dominik-a11y/budzetapp
