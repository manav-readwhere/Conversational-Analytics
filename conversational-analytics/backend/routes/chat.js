import express from 'express';
import geminiService from '../services/gemini.js';
import bigqueryService from '../services/bigquery.js';

const router = express.Router();

/**
 * POST /api/chat
 * Handles conversational analytics queries
 */
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string',
      });
    }

    // Get table schemas for context (optional - can be optimized to only get relevant tables)
    let tableSchemas = [];
    try {
      tableSchemas = await bigqueryService.getAllTableSchemas();
    } catch (error) {
      console.warn('Could not fetch table schemas, proceeding without schema context:', error.message);
      // Continue without schema context - Gemini may still generate valid queries
    }

    // Generate SQL query using Gemini
    let sqlQuery;
    try {
      const datasetId = bigqueryService.getDatasetId();
      sqlQuery = await geminiService.generateSQL(message, tableSchemas, datasetId);
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to generate SQL query',
        details: error.message,
      });
    }

    // Validate SQL query (basic check)
    if (!sqlQuery || sqlQuery.trim().length === 0) {
      return res.status(500).json({
        error: 'Generated SQL query is empty',
      });
    }

    // Security: Basic SQL injection prevention
    // Only allow SELECT statements
    const trimmedQuery = sqlQuery.trim().toUpperCase();

    if (!trimmedQuery.includes('SELECT')) {
      return res.status(400).json({
        error: 'Only SELECT queries are allowed for security reasons',
        generatedQuery: sqlQuery,
      });
    }

    // Execute query on BigQuery
    let results;
    try {
      results = await bigqueryService.executeQuery(sqlQuery);
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to execute query on BigQuery',
        details: error.message,
        generatedQuery: sqlQuery,
      });
    }

    // Generate natural language explanation of results
    let explanation;
    try {
      explanation = await geminiService.explainResults(message, sqlQuery, results);
    } catch (error) {
      console.warn('Could not generate explanation:', error.message);
      explanation = `Query executed successfully. Found ${results.length} result(s).`;
    }

    // Format response
    res.json({
      success: true,
      userQuery: message,
      sqlQuery: sqlQuery,
      explanation: explanation,
      results: results,
      resultCount: results.length,
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

export default router;

