import duckdb from 'duckdb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database connection
function initDatabaseConnection() {
  const dbPath = path.join(__dirname, '../../data/ecommerce.duckdb');
  const dataDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new duckdb.Database(dbPath);
  const connection = db.connect();
  return connection;
}

// Create tables
async function createTables(connection) {
  const tables = [
    {
      name: 'customers',
      schema: `CREATE TABLE IF NOT EXISTS customers (
        customer_id VARCHAR PRIMARY KEY,
        customer_unique_id VARCHAR,
        customer_zip_code_prefix VARCHAR,
        customer_city VARCHAR,
        customer_state VARCHAR
      )`
    },
    {
      name: 'products',
      schema: `CREATE TABLE IF NOT EXISTS products (
        product_id VARCHAR PRIMARY KEY,
        product_category_name VARCHAR,
        product_name_lenght INTEGER,
        product_description_lenght INTEGER,
        product_photos_qty INTEGER,
        product_weight_g DECIMAL(10,2),
        product_length_cm DECIMAL(10,2),
        product_height_cm DECIMAL(10,2),
        product_width_cm DECIMAL(10,2)
      )`
    },
    {
      name: 'sellers',
      schema: `CREATE TABLE IF NOT EXISTS sellers (
        seller_id VARCHAR PRIMARY KEY,
        seller_zip_code_prefix VARCHAR,
        seller_city VARCHAR,
        seller_state VARCHAR
      )`
    },
    {
      name: 'geolocation',
      schema: `CREATE TABLE IF NOT EXISTS geolocation (
        geolocation_zip_code_prefix VARCHAR,
        geolocation_lat DECIMAL(10,8),
        geolocation_lng DECIMAL(11,8),
        geolocation_city VARCHAR,
        geolocation_state VARCHAR
      )`
    },
    {
      name: 'orders',
      schema: `CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR PRIMARY KEY,
        customer_id VARCHAR,
        order_status VARCHAR,
        order_purchase_timestamp TIMESTAMP,
        order_approved_at TIMESTAMP,
        order_delivered_carrier_date TIMESTAMP,
        order_delivered_customer_date TIMESTAMP,
        order_estimated_delivery_date TIMESTAMP
      )`
    },
    {
      name: 'order_items',
      schema: `CREATE TABLE IF NOT EXISTS order_items (
        order_id VARCHAR,
        order_item_id INTEGER,
        product_id VARCHAR,
        seller_id VARCHAR,
        shipping_limit_date TIMESTAMP,
        price DECIMAL(10,2),
        freight_value DECIMAL(10,2),
        PRIMARY KEY (order_id, order_item_id)
      )`
    },
    {
      name: 'order_payments',
      schema: `CREATE TABLE IF NOT EXISTS order_payments (
        order_id VARCHAR,
        payment_sequential INTEGER,
        payment_type VARCHAR,
        payment_installments INTEGER,
        payment_value DECIMAL(10,2),
        PRIMARY KEY (order_id, payment_sequential)
      )`
    },
    {
      name: 'order_reviews',
      schema: `CREATE TABLE IF NOT EXISTS order_reviews (
        review_id VARCHAR,
        order_id VARCHAR,
        review_score INTEGER,
        review_comment_title VARCHAR,
        review_comment_message TEXT,
        review_creation_date TIMESTAMP,
        review_answer_timestamp TIMESTAMP
      )`
    }
  ];

  for (const table of tables) {
    await new Promise((resolve, reject) => {
      connection.run(table.schema, (err) => {
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

async function loadCSVData() {
  try {
    const connection = initDatabaseConnection();
    console.log('✅ DuckDB database initialized');
    
    const dataDir = path.join(__dirname, '../../data/csv');
    
    if (!fs.existsSync(dataDir)) {
      console.log('⚠️  CSV data directory not found. Please download the dataset from:');
      console.log('   https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce/');
      console.log('   Extract CSV files to: data/csv/');
      return;
    }

    // Drop existing tables in reverse dependency order
    console.log('🧹 Cleaning up existing tables...');
    const tablesToDrop = [
      'order_reviews',
      'order_payments',
      'order_items',
      'orders',
      'geolocation',
      'sellers',
      'products',
      'customers'
    ];

    for (const table of tablesToDrop) {
      await new Promise((resolve) => {
        connection.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
          // Ignore errors
          resolve();
        });
      });
    }

    // Create tables
    console.log('📋 Creating tables...');
    await createTables(connection);

    const csvFiles = {
      'customers': 'olist_customers_dataset.csv',
      'orders': 'olist_orders_dataset.csv',
      'order_items': 'olist_order_items_dataset.csv',
      'products': 'olist_products_dataset.csv',
      'order_payments': 'olist_order_payments_dataset.csv',
      'order_reviews': 'olist_order_reviews_dataset.csv',
      'sellers': 'olist_sellers_dataset.csv',
      'geolocation': 'olist_geolocation_dataset.csv'
    };

    for (const [table, filename] of Object.entries(csvFiles)) {
      const filePath = path.join(dataDir, filename);
      
      if (fs.existsSync(filePath)) {
        console.log(`📥 Loading ${table}...`);
        
        // Load CSV
        await new Promise((resolve, reject) => {
          const filePathNormalized = filePath.replace(/\\/g, '/');
          connection.run(
            `COPY ${table} FROM '${filePathNormalized}' (HEADER, DELIMITER ',')`,
            (err) => {
              if (err) {
                console.error(`❌ Error loading ${table}:`, err.message);
                reject(err);
              } else {
                // Get row count
                connection.all(`SELECT COUNT(*) as count FROM ${table}`, (err, rows) => {
                  if (!err && rows && rows.length > 0) {
                    console.log(`✅ Loaded ${rows[0].count} rows into ${table}`);
                  }
                  resolve();
                });
              }
            }
          );
        });
      } else {
        console.log(`⚠️  File not found: ${filename}`);
      }
    }

    console.log('\n✅ Database setup complete!');
  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exit(1);
  }
}

loadCSVData();

