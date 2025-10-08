# Budget App Backend - Prisma + MySQL

REST API for the Budget App mobile application using Prisma ORM with MySQL database.

## Features

- **Prisma ORM** for type-safe database access
- **MySQL** database for production-ready storage
- RESTful API endpoints
- CORS enabled for mobile app access
- Transaction CRUD operations
- Summary statistics

## Prerequisites

- Node.js (v14 or newer)
- MySQL Server (v5.7 or newer) or MariaDB
- npm or yarn

## Installation

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Setup MySQL Database

**Option A: Local MySQL Installation**

1. Install MySQL from https://dev.mysql.com/downloads/
2. Start MySQL server
3. Create a database:

```sql
CREATE DATABASE budget_app;
```

**Option B: Using XAMPP**

1. Install XAMPP from https://www.apachefriends.org/
2. Start Apache and MySQL from XAMPP Control Panel
3. Open phpMyAdmin (http://localhost/phpmyadmin)
4. Create a new database called `budget_app`

**Option C: Docker**

```bash
docker run --name mysql-budget -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=budget_app -p 3306:3306 -d mysql:8
```

### Step 3: Configure Environment Variables

Create a `.env` file in the `backend` folder:

```bash
# backend/.env
DATABASE_URL="mysql://root:password@localhost:3306/budget_app"
PORT=3000
NODE_ENV=development
```

**Update these values:**
- `root` - your MySQL username
- `password` - your MySQL password  
- `localhost` - your MySQL host (usually localhost)
- `3306` - MySQL port (default is 3306)
- `budget_app` - your database name

**Example for XAMPP (default no password):**
```
DATABASE_URL="mysql://root:@localhost:3306/budget_app"
```

### Step 4: Run Prisma Migrations

Generate Prisma Client and create database tables:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:push

# Or use migrations (recommended for production)
npm run prisma:migrate
```

You should see: `✓ Your database is now in sync with your schema`

### Step 5: Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:3000`

You should see:
```
✓ Connected to MySQL database via Prisma
🚀 Budget API server running on http://localhost:3000
📊 Database: MySQL with Prisma ORM
```

## Prisma Commands

```bash
# Generate Prisma Client after schema changes
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Push schema to database without migrations
npm run prisma:push

# Open Prisma Studio (GUI for database)
npm run prisma:studio
```

## API Endpoints

### Transactions

- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Summary

- `GET /api/summary` - Get financial summary (income, expense, balance)

### Health Check

- `GET /api/health` - Check if API is running

## Request/Response Examples

### Create Transaction
```json
POST /api/transactions
Content-Type: application/json

{
  "id": "1234567890",
  "title": "Grocery Shopping",
  "amount": 500,
  "type": "expense",
  "category": "Food",
  "date": "10/8/2025",
  "timestamp": 1234567890
}
```

### Response
```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": "1234567890",
    "title": "Grocery Shopping",
    "amount": 500,
    "type": "expense",
    "category": "Food",
    "date": "10/8/2025",
    "timestamp": "1234567890",
    "createdAt": "2025-10-08T12:00:00.000Z",
    "updatedAt": "2025-10-08T12:00:00.000Z"
  }
}
```

## Database Schema

```prisma
model Transaction {
  id        String   @id @default(uuid())
  title     String
  amount    Float
  type      String   // "income" or "expense"
  category  String
  date      String
  timestamp BigInt
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Troubleshooting

### Connection Errors

**Error: Can't reach database server**
- Check MySQL is running
- Verify connection details in `.env`
- Test connection: `mysql -u root -p`

**Error: Access denied for user**
- Check username and password in DATABASE_URL
- Grant privileges: `GRANT ALL PRIVILEGES ON budget_app.* TO 'root'@'localhost';`

**Error: Unknown database 'budget_app'**
- Create the database: `CREATE DATABASE budget_app;`

### Port Already in Use

If port 3000 is taken:
1. Change PORT in `.env`
2. Update `src/config/api.js` in the mobile app

### Prisma Generate Errors

```bash
# Clear Prisma cache
npx prisma generate --force

# Reinstall Prisma
npm uninstall @prisma/client prisma
npm install @prisma/client prisma
```

## Viewing Data

### Using Prisma Studio

```bash
npm run prisma:studio
```

Opens a browser GUI at `http://localhost:5555` to view and edit database data.

### Using MySQL Command Line

```bash
mysql -u root -p
USE budget_app;
SELECT * FROM transactions;
```

### Using phpMyAdmin (XAMPP)

Open http://localhost/phpmyadmin and select `budget_app` database.

## Development Tips

### Reset Database

```bash
# Drop all tables and recreate
npx prisma db push --force-reset
```

### Seed Database (Optional)

Create `backend/prisma/seed.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.transaction.create({
    data: {
      title: 'Initial Balance',
      amount: 1000,
      type: 'income',
      category: 'Salary',
      date: new Date().toLocaleDateString(),
      timestamp: BigInt(Date.now())
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run: `node prisma/seed.js`

## Production Deployment

### Using PlanetScale (Free MySQL)

1. Sign up at https://planetscale.com
2. Create a database
3. Get connection string
4. Update DATABASE_URL in production environment

### Using Railway

1. Sign up at https://railway.app
2. Deploy from GitHub
3. Add MySQL service
4. Set DATABASE_URL environment variable

### Environment Variables for Production

```
DATABASE_URL="mysql://user:password@host:3306/database?ssl-mode=REQUIRED"
PORT=3000
NODE_ENV=production
```

## License

This project is open source and available for personal and commercial use.