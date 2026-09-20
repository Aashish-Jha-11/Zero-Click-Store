# DukaanPilot — Your Kirana's Autonomous Store Operator

> **Hackathon Track 1: Zero-Click Store Operator**
>
> A genuinely autonomous, end-to-end working store operator that takes natural-language customer requests, reasons over real store data, executes backend actions, mutates the database, and proves every step during the demo.

## 🎯 What This Does

DukaanPilot is NOT a chatbot — it's an **autonomous store operator**.

```
Customer says: "Bhaiya 2 Maggi, 1 milk aur 1 bread de do"

DukaanPilot:
✓ Understands the request (Hindi/Hinglish/English)
✓ Searches the product database
✓ Checks real inventory levels
✓ Verifies current prices
✓ Calculates the total
✓ Creates the order atomically
✓ Updates inventory in the database
✓ Generates confirmation with order ID
```

**The difference:**
- ❌ Chatbot: "I have added your order" (did it though?)
- ✅ Autonomous Operator: Shows you every step, every database mutation, provable results

## 🏗️ Architecture

```
┌─────────────────┐
│    Next.js      │  Mobile-first React UI
│   Frontend      │  Activity timeline
│   (Port 3000)   │  Order/Inventory views
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│  Node.js +      │  Agent orchestrator
│  Express        │  Deterministic tools
│  (Port 3001)    │  Services + validation
└────┬───────┬────┘
     │       │
     ▼       ▼
┌─────────┐ ┌──────────────┐
│Supabase │ │Claude/Omni   │
│PostgreSQL│ │Router        │
│Auth, RLS │ │Reasoning AI  │
└─────────┘ └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- OmniRouter API key (for Claude access)

### 1. Database Setup

1. Go to [Supabase Dashboard](https://bsdcklnrujljtfqmvsln.supabase.co)
2. Open **SQL Editor**
3. Run `backend/schema.sql` — creates all tables, RLS policies, and the atomic `finalize_order` RPC
4. Run `backend/seed.sql` — seeds "Sharma General Store" with 15 Indian Kirana products

Verify:
```sql
SELECT s.name, COUNT(p.id) as products, SUM(p.stock_quantity) as stock
FROM stores s
LEFT JOIN products p ON p.store_id = s.id
GROUP BY s.id, s.name;
```

Expected: **Sharma General Store** with **15 products** and **~220 total stock**.

### 2. Backend Setup

```bash
cd backend

# Environment is already set up in .env
# Verify these are present:
# - SUPABASE_URL
# - SUPABASE_SECRET_KEY
# - OMNIROUTER_API_KEY

npm install
npm run dev
```

Backend runs on **http://localhost:3001**

Health check: `curl http://localhost:3001/api/health`

### 3. Frontend Setup

```bash
cd frontend

# Environment is already set up in .env.local
# Includes Supabase URL and anon key

npm install
npm run dev
```

Frontend runs on **http://localhost:3000**

### 4. Test the Autonomous Flow

1. Open **http://localhost:3000**
2. Type: `"Bhaiya 2 Maggi, 1 Amul Taaza milk aur 1 bread de do"`
3. Watch the autonomous activity timeline
4. See the order created with order ID
5. Click **Inventory** — verify stock decreased
6. Click **Orders** — see the order with full details

## 🎬 Demo Script

### Demo 1: Happy Path (Success)

**Input:**
```
Bhaiya 2 Maggi, 1 Amul Taaza milk aur 1 bread de do
```

**What the judge sees:**
1. Request arrives
2. Agent parses intent
3. Products found in database
4. Stock verified (all available)
5. Prices fetched from DB
6. Total calculated: ₹126
7. Order created: Order #abc123
8. Inventory updated atomically
9. Confirmation displayed

**Then navigate to Inventory page** — show that:
- Maggi: 37 → 35
- Milk: 18 → 17
- Bread: 4 → 3

**This is the proof.** Real database mutations, not fake LLM responses.

### Demo 2: Insufficient Stock (Failure Case)

**Input:**
```
10 bread
```

(Only 4 available)

**Expected:**
```
Only 4 Britannia Bread are currently available.
```

**No order created.** This proves the system validates against real data, not hallucinations.

### Demo 3: Ambiguous Product (Clarification)

**Input:**
```
Give me milk
```

**Expected:**
```
Which milk?
1. Amul Taaza Milk 1L — ₹58
2. Amul Gold Milk 1L — ₹68
```

Shows grounded clarification instead of guessing.

## 🛠️ Key Technical Features

### 1. Atomic Order Creation

The `finalize_order` PostgreSQL function ensures:
```
BEGIN TRANSACTION
  ✓ Validate all stock levels (with row locks)
  ✓ Create order
  ✓ Create order items
  ✓ Deduct inventory
  ✓ Log activity
COMMIT
```

If ANY step fails → entire transaction rolls back. No partial orders.

### 2. Tool-Based Architecture

The LLM **does not** calculate prices, check stock, or mutate data directly.

It **only** decides which tools to call:
- `search_products` → finds product IDs
- `check_inventory` → verifies stock
- `get_price` → gets current price
- `calculate_cart` → backend calculates total
- `create_order` → atomic DB operation

Backend validates everything. LLM is the reasoning layer, not the authority.

### 3. Activity Logs

Every workflow step is logged to `activity_logs` table:
- `request_received`
- `intent_parsed`
- `product_found`
- `inventory_checked`
- `price_verified`
- `order_created`
- `inventory_updated`
- `confirmation_sent`

This gives both observability and a beautiful demo timeline.

### 4. Error Handling

Handles:
- Unknown products → suggest alternatives
- Insufficient stock → tell exact availability
- Ambiguous queries → ask for clarification
- LLM failures → graceful fallback
- Database errors → atomic rollback

### 5. Multi-Language Support

Understands:
- English: "2 Maggi, 1 milk and 1 bread"
- Hindi: "2 Maggi, 1 doodh aur 1 bread"
- Hinglish: "Bhaiya 2 Maggi, 1 Amul milk de do"

The prompt is tuned for Indian Kirana context.

## 📁 Project Structure

```
backend/
├── src/
│   ├── agents/
│   │   ├── orchestrator.ts    # Main agent loop
│   │   ├── prompts.ts         # System prompt
│   │   └── schemas.ts         # Tool definitions
│   ├── tools/                 # Tool implementations
│   ├── services/              # Business logic
│   ├── routes/                # Express routes
│   ├── middleware/            # Auth, validation, errors
│   └── lib/                   # Supabase, LLM clients
├── schema.sql                 # Database schema
├── seed.sql                   # Demo data
└── DATABASE.md                # DB setup guide

frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main operator screen
│   │   ├── orders/           # Orders view
│   │   └── inventory/        # Inventory view
│   └── lib/
│       ├── api.ts            # API client
│       ├── utils.ts          # Helpers
│       └── supabase.ts       # Supabase client
└── .env.local                # Frontend env
```

## 🔐 Security

- **RLS (Row Level Security)** on all tables
- Service role key only on backend (never exposed to browser)
- Auth middleware with demo mode fallback
- Input validation with Zod schemas
- SQL injection protection (parameterized queries)
- CORS configured for localhost (update for production)

## 🚢 Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel deploy --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL` (your backend URL)

### Backend (Railway/Render)

```bash
cd backend
# Deploy to Railway or Render
# Set environment variables:
# - PORT=3001
# - SUPABASE_URL
# - SUPABASE_SECRET_KEY
# - OMNIROUTER_API_KEY
```

Update CORS in `backend/src/app.ts` to allow your frontend domain.

## 📊 API Endpoints

### Agent
- `POST /api/agent/run` — Run autonomous workflow

### Products
- `GET /api/products` — List all products

### Orders
- `GET /api/orders` — List orders
- `GET /api/orders/:id` — Get order details

### Inventory
- `GET /api/inventory` — Get current stock levels

### Activity
- `GET /api/activity` — Get activity logs
- `GET /api/activity/request/:requestId` — Logs for specific request

## 🎨 Design Principles

1. **Clarity > Novelty** — Product identity clear in 5 seconds
2. **Mobile-first** — Touch-friendly, responsive
3. **Activity timeline is evidence** — Not decoration, it's proof
4. **Loading states** — Never blank screens
5. **Graceful failures** — Errors are readable and actionable

## 🧪 Testing Checklist

- [ ] Run schema.sql successfully
- [ ] Run seed.sql successfully
- [ ] Backend health check returns 200
- [ ] Frontend loads on localhost:3000
- [ ] Happy path order works
- [ ] Inventory decreases after order
- [ ] Order appears in orders page
- [ ] Insufficient stock case works
- [ ] Ambiguous product clarification works
- [ ] Mobile responsive (test 375px, 768px, 1440px)
- [ ] No horizontal scroll on mobile
- [ ] Activity timeline animates smoothly

## 🏆 What Makes This Demo Strong

1. **End-to-end working** — Not a mock, not a prototype
2. **Provable autonomy** — Activity logs + DB mutations visible
3. **Failure cases handled** — Shows validation, not just happy path
4. **Real Indian context** — Hindi/Hinglish, Kirana products
5. **Clean architecture** — LLM reasons, tools validate, DB is truth
6. **Responsive UI** — Works on phone, tablet, desktop
7. **Production patterns** — Transactions, validation, error handling

## 🐛 Troubleshooting

**Backend won't start:**
- Check `.env` has all required variables
- Verify Supabase credentials
- Run `npm install` again

**Frontend shows "Failed to fetch":**
- Verify backend is running on port 3001
- Check CORS settings in `backend/src/app.ts`
- Verify `NEXT_PUBLIC_API_BASE_URL` in `.env.local`

**Database errors:**
- Verify `schema.sql` ran successfully
- Check `seed.sql` inserted data
- Test Supabase connection from backend

**LLM not responding:**
- Verify `OMNIROUTER_API_KEY` is set
- Check OmniRouter API quota/limits
- Look for errors in backend console

## 📝 License

MIT

## 👥 Credits

Built for Hackathon Track 1: Zero-Click Store Operator

**Stack:**
- Next.js 15 + React
- Node.js + Express
- Supabase (PostgreSQL + Auth)
- Claude via OmniRouter
- Tailwind CSS + Framer Motion
