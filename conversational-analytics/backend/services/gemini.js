import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini service for converting natural language to SQL queries
 */
class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this._initialized = false;
  }

  /**
   * Initialize the Gemini client (lazy loading)
   */
  _initialize() {
    if (this._initialized) {
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    // Use environment variable for model name, default to gemini-1.5-flash
    // Valid options: gemini-1.5-flash, gemini-1.5-pro, gemini-pro
    let modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';

    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
        model: modelName 
    });
    this._initialized = true;
  }

  /**
   * Generate SQL query from natural language using Gemini
   * @param {string} userQuery - Natural language query from user
   * @param {Array} tableSchemas - Array of table schema information for context
   * @param {string} datasetId - BigQuery dataset ID (required for table qualification)
   * @returns {Promise<string>} Generated SQL query
   */
  async generateSQL(userQuery, tableSchemas = [], datasetId = null) {
    this._initialize();
    try {
      // Build schema context for the prompt
      let schemaContext = '';
      if (tableSchemas && tableSchemas.length > 0) {
        schemaContext = '\n\nAvailable tables and their schemas:\n';
        tableSchemas.forEach(schema => {
          // Use fully qualified table name (dataset.table) if dataset is provided
          const qualifiedTableName = datasetId 
            ? `${datasetId}.${schema.tableName}`
            : schema.tableName;
          schemaContext += `\nTable: ${qualifiedTableName}\n`;
          if (schema.description) {
            schemaContext += `Description: ${schema.description}\n`;
          }
          schemaContext += 'Columns:\n';
          schema.schema.forEach(field => {
            schemaContext += `  - ${field.name} (${field.type}${field.mode ? `, ${field.mode}` : ''})`;
            if (field.description) {
              schemaContext += `: ${field.description}`;
            }
            schemaContext += '\n';
          });
        });
      }

      const datasetInstruction = datasetId 
        ? `\nCRITICAL: All table names MUST be qualified with the dataset name "${datasetId}". Use the format "${datasetId}.table_name" for all table references.`
        : '';

      const prompt = `You are a SQL expert assistant. Convert the following natural language query into a valid BigQuery SQL query.

${schemaContext}${datasetInstruction}

Important guidelines:
1. Generate ONLY the SQL query, no explanations or markdown formatting
2. Use standard BigQuery SQL syntax
3. For exploratory queries, use appropriate aggregations (COUNT, SUM, AVG, etc.)
4. For predefined queries, follow the exact requirements
5. Always use proper table and column names from the schema provided
6. Include appropriate WHERE clauses when filtering is mentioned
7. Use LIMIT clause when appropriate to prevent large result sets
8. Format dates and timestamps properly if needed
9. ALWAYS qualify table names with the dataset name using the format: dataset.table_name

User query: ${userQuery}

SQL Query:`;

      console.log(schemaContext)
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let sqlQuery = response.text().trim();

      // Clean up the SQL query (remove markdown code blocks if present)
      sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();

      return sqlQuery;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate SQL: ${error.message}`);
    }
  }

  /**
   * Generate a natural language explanation of query results
   * @param {string} userQuery - Original user query
   * @param {string} sqlQuery - SQL query that was executed
   * @param {Array} results - Query results
   * @returns {Promise<string>} Natural language explanation
   */
  async explainResults(userQuery, sqlQuery, results) {
    this._initialize();
    try {
      const resultsSummary = results.length > 0 
        ? `Found ${results.length} result(s). Sample data: ${JSON.stringify(results.slice(0, 3))}`
        : 'No results found.';

      const prompt = `The user asked: "${userQuery}"
The SQL query executed was: ${sqlQuery}
${resultsSummary}

Provide a brief, conversational explanation of the results. Keep it concise and user-friendly. Do not end with a period unless necessary.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let explanation = response.text().trim();
      
      // Remove trailing period if it exists
      if (explanation.endsWith('.')) {
        explanation = explanation.slice(0, -1);
      }
      
      return explanation;
    } catch (error) {
      console.error('Error generating explanation:', error);
      return 'Query executed successfully.';
    }
  }
}

export default new GeminiService();

