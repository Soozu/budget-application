require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test database connection
prisma.$connect()
  .then(() => {
    console.log('✓ Connected to MySQL database via Prisma');
  })
  .catch((err) => {
    console.error('✗ Failed to connect to database:', err.message);
    process.exit(1);
  });

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Budget API is running',
    database: 'MySQL with Prisma'
  });
});

// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        timestamp: 'desc'
      }
    });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single transaction
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { id, title, amount, type, category, date, timestamp } = req.body;

    if (!title || !amount || !type || !category || !date || !timestamp) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const transaction = await prisma.transaction.create({
      data: {
        id: id || undefined, // Let Prisma generate if not provided
        title,
        amount: parseFloat(amount),
        type,
        category,
        date,
        timestamp: BigInt(timestamp)
      }
    });

    res.status(201).json({ 
      message: 'Transaction created successfully',
      transaction: {
        ...transaction,
        timestamp: transaction.timestamp.toString() // Convert BigInt to string for JSON
      }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update transaction
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { title, amount, type, category, date } = req.body;

    const transaction = await prisma.transaction.update({
      where: {
        id: req.params.id
      },
      data: {
        title,
        amount: parseFloat(amount),
        type,
        category,
        date
      }
    });

    res.json({ 
      message: 'Transaction updated successfully',
      transaction: {
        ...transaction,
        timestamp: transaction.timestamp.toString()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Transaction not found' });
    } else {
      console.error('Error updating transaction:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await prisma.transaction.delete({
      where: {
        id: req.params.id
      }
    });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Transaction not found' });
    } else {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Get summary statistics
app.get('/api/summary', async (req, res) => {
  try {
    const [incomeData, expenseData, savingsData] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'income' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { type: 'expense' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { 
          type: 'expense',
          category: 'Savings'
        },
        _sum: { amount: true }
      })
    ]);

    const totalIncome = incomeData._sum.amount || 0;
    const totalExpense = expenseData._sum.amount || 0;
    const totalSavings = savingsData._sum.amount || 0;
    const balance = totalIncome - totalExpense;

    res.json({
      totalIncome,
      totalExpense,
      totalSavings,
      balance
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Budget endpoints
// Get budget
app.get('/api/budget', async (req, res) => {
  try {
    let budget = await prisma.budget.findUnique({
      where: { userId: 'default' }
    });

    if (!budget) {
      budget = await prisma.budget.create({
        data: { userId: 'default' }
      });
    }

    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update budget
app.post('/api/budget', async (req, res) => {
  try {
    const { weeklyAllowance, transportation, food, supplies, load, projects, savings } = req.body;

    const budget = await prisma.budget.upsert({
      where: { userId: 'default' },
      update: {
        weeklyAllowance: parseFloat(weeklyAllowance) || 0,
        transportation: parseFloat(transportation) || 0,
        food: parseFloat(food) || 0,
        supplies: parseFloat(supplies) || 0,
        load: parseFloat(load) || 0,
        projects: parseFloat(projects) || 0,
        savings: parseFloat(savings) || 0,
      },
      create: {
        userId: 'default',
        weeklyAllowance: parseFloat(weeklyAllowance) || 0,
        transportation: parseFloat(transportation) || 0,
        food: parseFloat(food) || 0,
        supplies: parseFloat(supplies) || 0,
        load: parseFloat(load) || 0,
        projects: parseFloat(projects) || 0,
        savings: parseFloat(savings) || 0,
      }
    });

    res.json({ 
      message: 'Budget saved successfully',
      budget 
    });
  } catch (error) {
    console.error('Error saving budget:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get statistics by period
app.get('/api/statistics/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const now = new Date();
    let startDate;

    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        timestamp: {
          gte: BigInt(startDate.getTime())
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Calculate statistics
    const stats = {
      totalSpent: 0,
      totalIncome: 0,
      byCategory: {},
      transactionCount: transactions.length,
    };

    transactions.forEach((txn) => {
      if (txn.type === 'expense') {
        stats.totalSpent += txn.amount;
        stats.byCategory[txn.category] = (stats.byCategory[txn.category] || 0) + txn.amount;
      } else {
        stats.totalIncome += txn.amount;
      }
    });

    res.json({
      ...stats,
      transactions: transactions.map(t => ({
        ...t,
        timestamp: t.timestamp.toString()
      }))
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notifications and insights
app.get('/api/notifications', async (req, res) => {
  try {
    const [transactions, budget] = await Promise.all([
      prisma.transaction.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100
      }),
      prisma.budget.findUnique({
        where: { userId: 'default' }
      })
    ]);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Calculate weekly spending by category
    const weeklySpending = {};
    transactions
      .filter(t => t.type === 'expense' && new Date(Number(t.timestamp)) >= weekAgo)
      .forEach(t => {
        const key = getCategoryKey(t.category);
        weeklySpending[key] = (weeklySpending[key] || 0) + t.amount;
      });

    const notifications = [];

    // Budget warnings
    if (budget) {
      const categories = ['transportation', 'food', 'supplies', 'load', 'projects', 'savings'];
      categories.forEach(key => {
        const budgetAmount = budget[key] || 0;
        const spent = weeklySpending[key] || 0;
        
        if (budgetAmount > 0) {
          const percentage = (spent / budgetAmount * 100);
          if (percentage >= 80) {
            notifications.push({
              type: percentage >= 100 ? 'alert' : 'warning',
              category: key,
              percentage: percentage.toFixed(0),
              spent,
              budget: budgetAmount,
              remaining: budgetAmount - spent
            });
          }
        }
      });
    }

    res.json({
      notifications,
      insights: {
        weeklySpending,
        totalSpent: Object.values(weeklySpending).reduce((a, b) => a + b, 0),
        budget: budget || {}
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

function getCategoryKey(category) {
  const mapping = {
    'Transportation': 'transportation',
    'Food & Snacks': 'food',
    'School Supplies': 'supplies',
    'Load/Data': 'load',
    'Projects': 'projects',
    'Savings': 'savings',
  };
  return mapping[category] || 'other';
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Budget API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: MySQL with Prisma ORM`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('\n✓ Prisma disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('\n✓ Prisma disconnected');
  process.exit(0);
});