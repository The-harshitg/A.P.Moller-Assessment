import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { executeQuery } from '../db/duckdb.js';

// Initialize Gemini model
// LangChain expects GOOGLE_API_KEY, but we also support GEMINI_API_KEY for clarity
function getApiKey() {
  const key1 = process.env.GOOGLE_API_KEY?.trim();
  const key2 = process.env.GEMINI_API_KEY?.trim();
  return key1 || key2;
}

let model = null;

function initializeModel() {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn('⚠️  Warning: No API key found. Set GOOGLE_API_KEY or GEMINI_API_KEY in your .env file');
    console.warn('💡 Get your API key from: https://makersuite.google.com/app/apikey');
    console.warn('⚠️  Chat functionality will not work without an API key');
    return false;
  }
  
  try {
    // With LangChain v1.0.0, try using the latest model names
    // The new version should support gemini-1.5-flash and gemini-1.5-pro
    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', undefined];
    
    for (const modelName of modelNames) {
      try {
        const config = {
          temperature: 0.3,
          apiKey: apiKey,
        };
        
        if (modelName) {
          config.modelName = modelName;
        }
        
        model = new ChatGoogleGenerativeAI(config);
        console.log(`✅ Gemini AI model initialized${modelName ? ` with ${modelName}` : ' (default model)'}`);
        return true;
      } catch (tryError) {
        if (modelName === undefined) {
          // Last attempt failed
          console.error('❌ Failed to create model:', tryError.message);
          throw tryError;
        }
        // Try next model name
        continue;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Failed to create model:', error.message);
    console.error('💡 This might indicate an API key issue');
    console.error('💡 Please check: https://makersuite.google.com/app/apikey');
    return false;
  }
}

// Lazy initialization - check if model is initialized before use
function ensureModelInitialized() {
  if (!model) {
    const initialized = initializeModel();
    if (!initialized) {
      throw new Error('Gemini API key not configured. Please set GOOGLE_API_KEY or GEMINI_API_KEY in your server/.env file');
    }
  }
  return model;
}

// Retry with different model if current one fails
async function retryWithDifferentModel(originalError, operation) {
  if (originalError.message && originalError.message.includes('is not found')) {
    console.log('🔄 Model not found, trying to reinitialize without modelName (default)...');
    // Reset model and try without modelName (uses default)
    model = null;
    try {
      model = new ChatGoogleGenerativeAI({
        temperature: 0.3,
        apiKey: getApiKey(),
      });
      console.log('✅ Reinitialized with default model, retrying operation...');
      return await operation();
    } catch (retryError) {
      console.error('❌ Retry failed:', retryError.message);
      // Try one more time with different model names
      const modelNames = ['gemini-1.0-pro', 'gemini-pro-001'];
      for (const modelName of modelNames) {
        try {
          model = null;
          model = new ChatGoogleGenerativeAI({
            modelName: modelName,
            temperature: 0.3,
            apiKey: getApiKey(),
          });
          console.log(`✅ Reinitialized with ${modelName}, retrying operation...`);
          return await operation();
        } catch (modelError) {
          console.log(`⚠️  ${modelName} also failed`);
          continue;
        }
      }
      throw originalError; // Throw original error if all retries fail
    }
  }
  throw originalError;
}

// Try to initialize model when module loads (but don't fail if env vars not loaded yet)
try {
  initializeModel();
} catch (error) {
  // Will retry when first used
  console.warn('Model initialization deferred:', error.message);
}

// Conversation memory (in production, use Redis or similar)
const conversationMemory = new Map();

// Get database schema for context
function getDatabaseSchema() {
  return `
Database Schema for Brazilian E-commerce Dataset:

1. customers table:
   - customer_id (VARCHAR, PRIMARY KEY): Unique order customer ID
   - customer_unique_id (VARCHAR): Unique customer identifier
   - customer_zip_code_prefix (VARCHAR): Customer zip code prefix
   - customer_city (VARCHAR): Customer city
   - customer_state (VARCHAR): Customer state

2. orders table:
   - order_id (VARCHAR, PRIMARY KEY): Unique order identifier
   - customer_id (VARCHAR, FOREIGN KEY): References customers.customer_id
   - order_status (VARCHAR): Order status (delivered, shipped, etc.)
   - order_purchase_timestamp (TIMESTAMP): When order was placed
   - order_approved_at (TIMESTAMP): When order was approved
   - order_delivered_carrier_date (TIMESTAMP): When order was sent to carrier
   - order_delivered_customer_date (TIMESTAMP): When order was delivered
   - order_estimated_delivery_date (TIMESTAMP): Estimated delivery date

3. order_items table:
   - order_id (VARCHAR, FOREIGN KEY): References orders.order_id
   - order_item_id (INTEGER): Item sequence number
   - product_id (VARCHAR, FOREIGN KEY): References products.product_id
   - seller_id (VARCHAR): Seller identifier
   - shipping_limit_date (TIMESTAMP): Shipping deadline
   - price (DECIMAL): Item price
   - freight_value (DECIMAL): Shipping cost

4. products table:
   - product_id (VARCHAR, PRIMARY KEY): Unique product identifier
   - product_category_name (VARCHAR): Product category (e.g., 'electronics', 'furniture')
   - product_name_lenght (INTEGER): Product name length
   - product_description_lenght (INTEGER): Description length
   - product_photos_qty (INTEGER): Number of photos
   - product_weight_g (DECIMAL): Weight in grams
   - product_length_cm (DECIMAL): Length in cm
   - product_height_cm (DECIMAL): Height in cm
   - product_width_cm (DECIMAL): Width in cm

5. order_payments table:
   - order_id (VARCHAR, FOREIGN KEY): References orders.order_id
   - payment_sequential (INTEGER): Payment sequence number
   - payment_type (VARCHAR): Payment method (credit_card, boleto, etc.)
   - payment_installments (INTEGER): Number of installments
   - payment_value (DECIMAL): Payment amount

6. order_reviews table:
   - review_id (VARCHAR, PRIMARY KEY): Unique review identifier
   - order_id (VARCHAR, FOREIGN KEY): References orders.order_id
   - review_score (INTEGER): Review score (1-5)
   - review_comment_title (VARCHAR): Review title
   - review_comment_message (TEXT): Review message
   - review_creation_date (TIMESTAMP): When review was created
   - review_answer_timestamp (TIMESTAMP): When review was answered

7. sellers table:
   - seller_id (VARCHAR, PRIMARY KEY): Unique seller identifier
   - seller_zip_code_prefix (VARCHAR): Seller zip code prefix
   - seller_city (VARCHAR): Seller city
   - seller_state (VARCHAR): Seller state

8. geolocation table:
   - geolocation_zip_code_prefix (VARCHAR): Zip code prefix
   - geolocation_lat (DECIMAL): Latitude
   - geolocation_lng (DECIMAL): Longitude
   - geolocation_city (VARCHAR): City
   - geolocation_state (VARCHAR): State

Common Relationships:
- orders.customer_id -> customers.customer_id
- order_items.order_id -> orders.order_id
- order_items.product_id -> products.product_id
- order_payments.order_id -> orders.order_id
- order_reviews.order_id -> orders.order_id
  `;
}

// External knowledge lookup (Wikipedia, product info, etc.)
async function getExternalKnowledge(query) {
  try {
    // For product categories, provide additional context
    const categoryInfo = {
      'electronics': 'Electronics category includes smartphones, computers, tablets, and other electronic devices.',
      'furniture': 'Furniture category includes home and office furniture items.',
      'home': 'Home category includes home decor, kitchen items, and household goods.',
      'sports': 'Sports category includes sports equipment and athletic gear.',
      'fashion': 'Fashion category includes clothing, shoes, and accessories.',
    };
    
    const lowerQuery = query.toLowerCase();
    for (const [category, info] of Object.entries(categoryInfo)) {
      if (lowerQuery.includes(category)) {
        return info;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Translate text (simple implementation)
function translateText(text, targetLang = 'en') {
  // In production, use Google Translate API or similar
  return text; // Placeholder
}

// Get location information
async function getLocationInfo(zipCode) {
  try {
    // In production, use geocoding API
    return `Location information for zip code ${zipCode}`;
  } catch (error) {
    return null;
  }
}

// Generate SQL query from natural language
async function generateSQL(userQuery, conversationHistory, schema) {
  const modelInstance = ensureModelInitialized();
  
  const systemPrompt = `You are an expert SQL query generator for an e-commerce database. 
Your task is to convert natural language questions into accurate SQL queries.

${schema}

Rules:
1. Always use proper JOINs when querying related tables
2. Use DuckDB date functions: DATE_TRUNC('month', column), EXTRACT(year FROM column), etc.
3. Handle aggregations correctly (SUM, AVG, COUNT, etc.)
4. Return ONLY the SQL query, no markdown, no explanations, no backticks
5. Use DuckDB SQL syntax (similar to PostgreSQL)
6. For date comparisons, use TIMESTAMP functions or CAST to DATE
7. Always include ORDER BY for ranking queries
8. Use LIMIT when appropriate (especially for "highest", "top", "first" queries)
9. Handle NULL values appropriately
10. Use aliases for better readability (e.g., oi for order_items, p for products)

Examples:
- "highest selling category" -> SELECT p.product_category_name, SUM(oi.price) as total_revenue FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE p.product_category_name IS NOT NULL GROUP BY p.product_category_name ORDER BY total_revenue DESC LIMIT 1
- "average order value" -> SELECT AVG(total_value) as avg_order_value FROM (SELECT oi.order_id, SUM(oi.price + oi.freight_value) as total_value FROM order_items oi GROUP BY oi.order_id)
- "past 2 quarters" -> Use DATE_TRUNC('quarter', o.order_purchase_timestamp) and filter WHERE o.order_purchase_timestamp >= DATE_TRUNC('quarter', CURRENT_DATE) - INTERVAL '6 months'
- "sales by month" -> SELECT DATE_TRUNC('month', o.order_purchase_timestamp) as month, SUM(oi.price) as total_sales FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.order_purchase_timestamp IS NOT NULL GROUP BY month ORDER BY month

User Query: ${userQuery}

Conversation History:
${conversationHistory.map(msg => `${msg.type}: ${msg.content}`).join('\n')}

Generate the SQL query:`;

  try {
    const modelInstance = ensureModelInitialized();
    const response = await modelInstance.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userQuery)
    ]);
    
    let sql = response.content.trim();
    
    // Clean up SQL (remove markdown code blocks if present)
    sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
    return sql;
  } catch (error) {
    console.error('Error generating SQL:', error);
    // Try retry with different model
    try {
      return await retryWithDifferentModel(error, async () => {
        const modelInstance = ensureModelInitialized();
        const response = await modelInstance.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(userQuery)
        ]);
        let sql = response.content.trim();
        sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
        return sql;
      });
    } catch (retryError) {
      throw new Error(`Failed to generate SQL query: ${error.message}`);
    }
  }
}

// Execute SQL and format results
async function executeSQLQuery(sql) {
  try {
    const results = await executeQuery(sql);
    return results;
  } catch (error) {
    console.error('SQL execution error:', error);
    throw new Error(`SQL Error: ${error.message}`);
  }
}

// Generate natural language response
async function generateResponse(userQuery, sql, results, conversationHistory, externalKnowledge) {
  const modelInstance = ensureModelInitialized();

  const resultsSummary = results.length > 0 
    ? `Query returned ${results.length} rows. Sample data: ${JSON.stringify(results.slice(0, 3))}`
    : 'Query returned no results.';

  const systemPrompt = `You are a helpful AI assistant for an e-commerce data analytics platform.
You help users understand their business data through natural language conversations.

${externalKnowledge ? `Additional Context: ${externalKnowledge}` : ''}

You just executed this SQL query:
${sql}

Results: ${resultsSummary}

Your task:
1. Provide a clear, conversational explanation of the results
2. Highlight key insights and patterns
3. Suggest follow-up questions if relevant
4. Be concise but informative
5. If the query returned data, summarize the findings
6. If there was an error, explain it in user-friendly terms

Conversation History:
${conversationHistory.map(msg => `${msg.type}: ${msg.content.substring(0, 100)}`).join('\n')}

User Query: ${userQuery}

Provide your response:`;

  try {
    const response = await modelInstance.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userQuery)
    ]);
    
    return response.content;
  } catch (error) {
    console.error('Error generating response:', error);
    return 'I encountered an error while processing your request. Please try rephrasing your question.';
  }
}

// Main agent function
export async function processQuery(userQuery, sessionId = 'default') {
  try {
    // Get or create conversation history
    if (!conversationMemory.has(sessionId)) {
      conversationMemory.set(sessionId, []);
    }
    const history = conversationMemory.get(sessionId);

    // Get database schema
    const schema = await getDatabaseSchema();

    // Get external knowledge if relevant
    const externalKnowledge = await getExternalKnowledge(userQuery);

    // Detect query type
    const lowerQuery = userQuery.toLowerCase();
    const isDataQuery = !lowerQuery.includes('translate') && 
                       !lowerQuery.includes('define') && 
                       !lowerQuery.includes('what is') && 
                       (lowerQuery.includes('show') || 
                        lowerQuery.includes('find') || 
                        lowerQuery.includes('which') || 
                        lowerQuery.includes('what') || 
                        lowerQuery.includes('how many') || 
                        lowerQuery.includes('average') || 
                        lowerQuery.includes('total') || 
                        lowerQuery.includes('highest') || 
                        lowerQuery.includes('lowest') || 
                        lowerQuery.includes('compare'));

    let response;
    let sql = null;
    let results = null;
    let visualizationData = null;

    if (isDataQuery) {
      // Generate and execute SQL
      sql = await generateSQL(userQuery, history, schema);
      results = await executeSQLQuery(sql);
      
      // Format data for visualization if applicable
      if (results && results.length > 0) {
        visualizationData = formatForVisualization(results, userQuery);
      }
      
      // Generate natural language response
      response = await generateResponse(userQuery, sql, results, history, externalKnowledge);
    } else {
      // Handle utility queries (definitions, translations, etc.)
      if (lowerQuery.includes('define') || lowerQuery.includes('what is')) {
        response = await handleDefinitionQuery(userQuery, externalKnowledge);
      } else if (lowerQuery.includes('translate')) {
        response = await handleTranslationQuery(userQuery);
      } else {
        // General conversation
        try {
          const modelInstance = ensureModelInitialized();
          const aiResponse = await modelInstance.invoke([
            new SystemMessage('You are a helpful assistant for an e-commerce analytics platform. Answer questions about the business, data, or help users understand how to query the data.'),
            ...history.map(msg => msg.type === 'human' ? new HumanMessage(msg.content) : new AIMessage(msg.content)),
            new HumanMessage(userQuery)
          ]);
          response = aiResponse.content;
        } catch (error) {
          response = 'I apologize, but the AI service is not configured. Please set GOOGLE_API_KEY or GEMINI_API_KEY in your server/.env file to enable chat functionality.';
        }
      }
    }

    // Update conversation history
    history.push({ type: 'human', content: userQuery });
    history.push({ type: 'ai', content: response });
    
    // Limit history size
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    return {
      response,
      sql,
      results,
      visualizationData,
      sessionId
    };
  } catch (error) {
    console.error('Agent error:', error);
    return {
      response: `I encountered an error: ${error.message}. Please try rephrasing your question or check if the data is loaded.`,
      sql: null,
      results: null,
      visualizationData: null,
      sessionId
    };
  }
}

// Format data for visualization
function formatForVisualization(results, query) {
  const lowerQuery = query.toLowerCase();
  
  // Determine chart type based on query
  if (lowerQuery.includes('category') || lowerQuery.includes('group')) {
    // Bar or pie chart
    const keys = Object.keys(results[0]);
    return {
      type: 'bar',
      data: results.map(row => ({
        label: row[keys[0]] || 'Unknown',
        value: parseFloat(row[keys[1]]) || 0
      }))
    };
  } else if (lowerQuery.includes('time') || lowerQuery.includes('quarter') || lowerQuery.includes('month') || lowerQuery.includes('date')) {
    // Line chart
    const keys = Object.keys(results[0]);
    return {
      type: 'line',
      data: results.map(row => ({
        label: row[keys[0]] || 'Unknown',
        value: parseFloat(row[keys[1]]) || 0
      }))
    };
  } else if (results.length === 1) {
    // Single value - could be a metric card
    return {
      type: 'metric',
      data: results[0]
    };
  }
  
  return null;
}

// Handle definition queries
async function handleDefinitionQuery(query, externalKnowledge) {
  if (externalKnowledge) {
    return externalKnowledge;
  }
  
  try {
    const modelInstance = ensureModelInitialized();
    const response = await modelInstance.invoke([
      new SystemMessage('You are a helpful assistant. Provide clear, concise definitions for e-commerce and business terms.'),
      new HumanMessage(query)
    ]);
    
    return response.content;
  } catch (error) {
    return 'I apologize, but the AI service is not configured. Please set GOOGLE_API_KEY or GEMINI_API_KEY in your server/.env file.';
  }
}

// Handle translation queries
async function handleTranslationQuery(query) {
  try {
    const modelInstance = ensureModelInitialized();
    const response = await modelInstance.invoke([
      new SystemMessage('You are a translation assistant. Translate text between languages as requested.'),
      new HumanMessage(query)
    ]);
    
    return response.content;
  } catch (error) {
    return 'I apologize, but the AI service is not configured. Please set GOOGLE_API_KEY or GEMINI_API_KEY in your server/.env file.';
  }
}

