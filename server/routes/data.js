import express from 'express';
import { executeQuery } from '../db/duckdb.js';

const router = express.Router();

// Get database statistics
router.get('/stats', async (req, res) => {
  try {
    // Execute queries without parameters to avoid parameter mismatch errors
    const customersResult = await executeQuery('SELECT COUNT(*) as count FROM customers');
    const ordersResult = await executeQuery('SELECT COUNT(*) as count FROM orders');
    const productsResult = await executeQuery('SELECT COUNT(*) as count FROM products');
    const orderItemsResult = await executeQuery('SELECT COUNT(*) as count FROM order_items');

    res.json({
      success: true,
      stats: {
        customers: Number(customersResult[0]?.count) || 0,
        orders: Number(ordersResult[0]?.count) || 0,
        products: Number(productsResult[0]?.count) || 0,
        orderItems: Number(orderItemsResult[0]?.count) || 0,
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    // Return default stats if query fails
    res.json({
      success: true,
      stats: {
        customers: 0,
        orders: 0,
        products: 0,
        orderItems: 0,
      }
    });
  }
});

// Get sample data
router.get('/sample/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const validTables = ['customers', 'orders', 'products', 'order_items', 'order_payments', 'order_reviews', 'sellers'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const data = await executeQuery(`SELECT * FROM ${table} LIMIT ${limit}`);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Sample data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

