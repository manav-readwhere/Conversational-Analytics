# Conversational Analytics Chat System

A full-stack application that enables natural language queries against BigQuery data using Google Gemini AI. Users can ask questions in plain English and receive SQL-generated results with conversational explanations.

## Features

- 🤖 **AI-Powered SQL Generation**: Uses Google Gemini to convert natural language queries into BigQuery SQL
- 💬 **Conversational Interface**: Chat-based UI for intuitive data exploration
- 📊 **Results Display**: Formatted table views of query results
- 🔍 **Exploratory & Predefined Queries**: Supports both ad-hoc and structured queries
- 💾 **Chat History**: Persistent message history using localStorage
- 🔒 **Security**: SQL injection prevention (SELECT queries only)

## Architecture

- **Frontend**: React with Vite
- **Backend**: Node.js with Express
- **AI**: Google Gemini API (gemini-pro model)
- **Database**: Google BigQuery
- **Authentication**: Service account JSON key file

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Google Cloud Project** with:
   - BigQuery dataset with data
   - Service account with BigQuery access
   - Gemini API enabled
3. **API Keys**:
   - Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Backend

1. Create a service account in Google Cloud Console:
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Grant it the "BigQuery Data Viewer" and "BigQuery Job User" roles
   - Download the JSON key file

2. Copy the backend environment template:
   ```bash
   cd backend
   cp .env.example .env
   ```

3. Edit `backend/.env` with your configuration:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL_NAME=gemini-1.5-flash
   BIGQUERY_PROJECT_ID=your_project_id
   BIGQUERY_DATASET=your_dataset_name
   GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   ```
   
   **Note:** `GEMINI_MODEL_NAME` is optional. Defaults to `gemini-1.5-flash`. Other options include `gemini-1.5-pro` or `gemini-pro-1.5`.

4. Place your service account JSON key file in the `backend/` directory and update the path in `.env`

### 3. Configure Frontend

1. Copy the frontend environment template:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Edit `frontend/.env` (optional, defaults are set):
   ```env
   VITE_API_URL=http://localhost:3001
   ```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# or for development with auto-reload:
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Usage

1. Open the frontend in your browser (http://localhost:5173)
2. Type a natural language question about your BigQuery data
3. Examples:
   - "Show me the total sales by region"
   - "What are the top 10 products by revenue?"
   - "Count the number of records in the users table"
   - "What is the average order value?"
4. View the results, SQL query, and AI-generated explanation

## Project Structure

```
conversational-analytics/
├── backend/
│   ├── routes/
│   │   └── chat.js          # Chat API endpoint
│   ├── services/
│   │   ├── bigquery.js      # BigQuery client and query execution
│   │   └── gemini.js        # Gemini AI integration
│   ├── server.js            # Express server setup
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ChatInterface.jsx  # Main chat UI component
│   │   ├── services/
│   │   │   └── api.js             # API client
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── .gitignore
└── README.md
```

## API Endpoints

### POST `/api/chat`

Send a natural language query and receive SQL results.

**Request:**
```json
{
  "message": "Show me the top 10 customers by revenue"
}
```

**Response:**
```json
{
  "success": true,
  "userQuery": "Show me the top 10 customers by revenue",
  "sqlQuery": "SELECT customer_id, SUM(revenue) as total_revenue FROM customers GROUP BY customer_id ORDER BY total_revenue DESC LIMIT 10",
  "explanation": "I found the top 10 customers ranked by their total revenue...",
  "results": [...],
  "resultCount": 10
}
```

## Security Considerations

- Only SELECT queries are allowed (prevents data modification)
- SQL queries are validated before execution
- Service account credentials should be kept secure and never committed to version control
- Consider implementing rate limiting for production use

## Troubleshooting

### "GEMINI_API_KEY environment variable is not set"
- Ensure your `backend/.env` file exists and contains `GEMINI_API_KEY`

### "BigQuery execution failed"
- Verify your service account has proper permissions
- Check that `GOOGLE_APPLICATION_CREDENTIALS` points to a valid JSON file
- Ensure `BIGQUERY_PROJECT_ID` and `BIGQUERY_DATASET` are correct

### "Failed to generate SQL query"
- Verify your Gemini API key is valid
- Check your API quota/limits
- Ensure the model name is correct (gemini-pro)

### CORS errors
- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check that the backend CORS configuration allows your frontend origin

## Future Enhancements

- Support for the official [Google Cloud Conversational Analytics API](https://cloud.google.com/gemini/docs/conversational-analytics-api/overview)
- Query result visualization (charts, graphs)
- Multi-turn conversation context
- Query history and favorites
- Export results to CSV/Excel
- User authentication and authorization
- Query performance optimization

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

