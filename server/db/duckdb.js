import duckdb from 'duckdb';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let connection = null;

export async function initializeDatabase() {
  try {
    const dbPath = path.join(__dirname, '../../data/ecommerce.duckdb');
    const dataDir = path.dirname(dbPath);
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new duckdb.Database(dbPath);
    connection = db.connect();

    console.log('✅ DuckDB database initialized');
    
    // Create tables if they don't exist
    await createTables(connection);
    
    return { db, connection };
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

async function createTables(conn) {
  // Create tables in dependency order:
  // 1. First, create tables with no foreign key dependencies
  // 2. Then, create tables that reference the base tables
  const tables = [
    // Base tables (no foreign keys)
    {
      name: 'customers',
      schema: `
        CREATE TABLE IF NOT EXISTS customers (
          customer_id VARCHAR PRIMARY KEY,
          customer_unique_id VARCHAR,
          customer_zip_code_prefix VARCHAR,
          customer_city VARCHAR,
          customer_state VARCHAR
        )
      `
    },
    {
      name: 'products',
      schema: `
        CREATE TABLE IF NOT EXISTS products (
          product_id VARCHAR PRIMARY KEY,
          product_category_name VARCHAR,
          product_name_lenght INTEGER,
          product_description_lenght INTEGER,
          product_photos_qty INTEGER,
          product_weight_g DECIMAL(10,2),
          product_length_cm DECIMAL(10,2),
          product_height_cm DECIMAL(10,2),
          product_width_cm DECIMAL(10,2)
        )
      `
    },
    {
      name: 'sellers',
      schema: `
        CREATE TABLE IF NOT EXISTS sellers (
          seller_id VARCHAR PRIMARY KEY,
          seller_zip_code_prefix VARCHAR,
          seller_city VARCHAR,
          seller_state VARCHAR
        )
      `
    },
    {
      name: 'geolocation',
      schema: `
        CREATE TABLE IF NOT EXISTS geolocation (
          geolocation_zip_code_prefix VARCHAR,
          geolocation_lat DECIMAL(10,8),
          geolocation_lng DECIMAL(11,8),
          geolocation_city VARCHAR,
          geolocation_state VARCHAR
        )
      `
    },
    // Tables that reference base tables
    // Note: Foreign key constraints are removed to handle data integrity issues
    // in real-world datasets where references may not always be perfect
    {
      name: 'orders',
      schema: `
        CREATE TABLE IF NOT EXISTS orders (
          order_id VARCHAR PRIMARY KEY,
          customer_id VARCHAR,
          order_status VARCHAR,
          order_purchase_timestamp TIMESTAMP,
          order_approved_at TIMESTAMP,
          order_delivered_carrier_date TIMESTAMP,
          order_delivered_customer_date TIMESTAMP,
          order_estimated_delivery_date TIMESTAMP
        )
      `
    },
    // Tables that reference orders and products
    {
      name: 'order_items',
      schema: `
        CREATE TABLE IF NOT EXISTS order_items (
          order_id VARCHAR,
          order_item_id INTEGER,
          product_id VARCHAR,
          seller_id VARCHAR,
          shipping_limit_date TIMESTAMP,
          price DECIMAL(10,2),
          freight_value DECIMAL(10,2),
          PRIMARY KEY (order_id, order_item_id)
        )
      `
    },
    {
      name: 'order_payments',
      schema: `
        CREATE TABLE IF NOT EXISTS order_payments (
          order_id VARCHAR,
          payment_sequential INTEGER,
          payment_type VARCHAR,
          payment_installments INTEGER,
          payment_value DECIMAL(10,2),
          PRIMARY KEY (order_id, payment_sequential)
        )
      `
    },
    {
      name: 'order_reviews',
      schema: `
        CREATE TABLE IF NOT EXISTS order_reviews (
          review_id VARCHAR,
          order_id VARCHAR,
          review_score INTEGER,
          review_comment_title VARCHAR,
          review_comment_message TEXT,
          review_creation_date TIMESTAMP,
          review_answer_timestamp TIMESTAMP
        )
      `
    }
  ];

  for (const table of tables) {
    await new Promise((resolve, reject) => {
      conn.run(table.schema, (err) => {
        if (err) {
          console.error(`Error creating table ${table.name}:`, err);
          reject(err);
        } else {
          console.log(`✅ Table ${table.name} ready`);
          resolve();
        }
      });
    });
  }
}

export function getConnection() {
  if (!connection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return connection;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// Helper function to execute queries
export function executeQuery(query, params = []) {
  const conn = getConnection();
  return new Promise((resolve, reject) => {
    // If no parameters provided, use run() instead of all() to avoid parameter mismatch
    if (!params || params.length === 0) {
      conn.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    } else {
      // Use prepared statement for queries with parameters
      conn.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    }
  });
}

