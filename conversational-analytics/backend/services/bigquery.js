import { BigQuery } from '@google-cloud/bigquery';

/**
 * BigQuery service for executing queries and retrieving schema information
 */
class BigQueryService {
  constructor() {
    this.bigquery = null;
    this.datasetId = null;
    this.datasetLocation = null;
    this._initialized = false;
  }

  /**
   * Initialize the BigQuery client (lazy loading)
   */
  _initialize() {
    if (this._initialized) {
      return;
    }

    // Initialize BigQuery client
    // Uses GOOGLE_APPLICATION_CREDENTIALS environment variable for service account
    const projectId = process.env.BIGQUERY_PROJECT_ID;
    if (!projectId) {
      throw new Error('BIGQUERY_PROJECT_ID environment variable is not set');
    }

    const datasetId = process.env.BIGQUERY_DATASET;
    if (!datasetId) {
      throw new Error('BIGQUERY_DATASET environment variable is not set');
    }

    this.bigquery = new BigQuery({
      projectId: projectId,
    });
    this.datasetId = datasetId;
    
    // Allow location to be set via environment variable, otherwise will be fetched dynamically
    this.datasetLocation = process.env.BIGQUERY_LOCATION || null;
    
    this._initialized = true;
  }

  /**
   * Get the dataset location from metadata
   * @returns {Promise<string>} Dataset location
   */
  async _getDatasetLocation() {
    if (this.datasetLocation) {
      return this.datasetLocation;
    }

    try {
      const dataset = this.bigquery.dataset(this.datasetId);
      const [metadata] = await dataset.getMetadata();
      this.datasetLocation = metadata.location || 'US';
      return this.datasetLocation;
    } catch (error) {
      console.warn('Could not fetch dataset location, defaulting to US:', error.message);
      this.datasetLocation = 'US';
      return this.datasetLocation;
    }
  }

  /**
   * Execute a SQL query on BigQuery
   * @param {string} query - SQL query string
   * @returns {Promise<Array>} Query results
   */
  async executeQuery(query) {
    this._initialize();
    try {
      // Get the dataset location dynamically
      const location = await this._getDatasetLocation();
      console.log("QUERY: ", query)
      const options = {
        query: query,
        location: location,
      };

      const [job] = await this.bigquery.createQueryJob(options);
      const [rows] = await job.getQueryResults();

      return rows;
    } catch (error) {
      console.error('BigQuery query error:', error);
      throw new Error(`BigQuery execution failed: ${error.message}`);
    }
  }

  /**
   * Get schema information for a specific table
   * @param {string} tableName - Name of the table
   * @returns {Promise<Object>} Table schema information
   */
  async getTableSchema(tableName) {
    this._initialize();
    try {
      const dataset = this.bigquery.dataset(this.datasetId);
      const table = dataset.table(tableName);
      const [metadata] = await table.getMetadata();
      
      return {
        tableName: tableName,
        schema: metadata.schema.fields,
        description: metadata.description || '',
      };
    } catch (error) {
      console.error(`Error getting schema for table ${tableName}:`, error);
      throw new Error(`Failed to get table schema: ${error.message}`);
    }
  }

  /**
   * Get list of all tables in the dataset
   * @returns {Promise<Array>} List of table names
   */
  async getTables() {
    this._initialize();
    try {
      const dataset = this.bigquery.dataset(this.datasetId);
      const [tables] = await dataset.getTables();
      
      return tables.map(table => table.id);
    } catch (error) {
      console.error('Error getting tables:', error);
      throw new Error(`Failed to get tables: ${error.message}`);
    }
  }

  /**
   * Get schema information for all tables in the dataset
   * @returns {Promise<Array>} Array of table schemas
   */
  async getAllTableSchemas() {
    try {
      const tables = await this.getTables();
      const schemas = await Promise.all(
        tables.map(tableName => this.getTableSchema(tableName))
      );
      return schemas;
    } catch (error) {
      console.error('Error getting all table schemas:', error);
      throw new Error(`Failed to get all table schemas: ${error.message}`);
    }
  }

  /**
   * Get the dataset ID
   * @returns {string} Dataset ID
   */
  getDatasetId() {
    this._initialize();
    return this.datasetId;
  }
}

export default new BigQueryService();

