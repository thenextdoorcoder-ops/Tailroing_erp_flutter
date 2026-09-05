# Frontend - Tailoring Management System

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. Start development server:
```bash
npm run dev
```

4. Open browser:
```
http://localhost:3000
```

## Pages

- `/login` - Authentication
- `/dashboard` - Main dashboard
- `/customers` - Customer management
- `/orders` - Order management
- `/products` - Product management

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Axios
- React Hook Form

## Build for Production
```bash
npm run build
npm start
```