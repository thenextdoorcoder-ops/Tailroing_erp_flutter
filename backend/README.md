# Backend - KTown Aari Works Tailoring Management System


## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update DATABASE_URL in `.env`

4. Generate Prisma Client:
```bash
npm run prisma:generate
```

5. Run migrations:
```bash
npm run prisma:migrate
```

6. Seed database:
```bash
npm run prisma:seed
```

7. Start server:
```bash
npm run dev
```

## API Endpoints

- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user
- GET `/api/customers` - List customers
- POST `/api/customers` - Create customer
- GET `/api/orders` - List orders
- POST `/api/orders` - Create order
- GET `/api/products` - List products
- POST `/api/products` - Create product
- GET `/api/dashboard/stats` - Dashboard stats

## Default Credentials

- Email: admin@tailoring.com
- Password: admin123

## Tech Stack

- Node.js + Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication