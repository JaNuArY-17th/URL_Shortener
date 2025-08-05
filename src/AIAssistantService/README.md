# AI Assistant Service

AI-powered assistant service for the URL Shortener system using Google Gemini MCP (Model Context Protocol). Provides intelligent insights, analytics, and user assistance while maintaining strict privacy controls.

## Features

### 🤖 AI-Powered Analytics
- **Smart URL Performance Analysis**: AI analyzes URL metrics and provides actionable insights
- **System Health Monitoring**: Comprehensive system analytics with AI-generated recommendations
- **Anomaly Detection**: Automatically detects unusual patterns in traffic and system behavior
- **User Behavior Analysis**: Anonymized user behavior insights and engagement patterns

### 🔒 Privacy-First Design
- **Limited Database Access**: Only accesses non-sensitive data from databases
- **User Data Protection**: Auth service user data (passwords, emails, names) are excluded
- **Data Anonymization**: User IDs are hashed by default for privacy
- **Configurable Privacy**: Can disable user data access entirely

### 💬 Natural Language Interface
- **Chat-based Queries**: Users can ask questions in natural language
- **Context-Aware Responses**: AI understands the URL shortener domain
- **Smart Suggestions**: AI generates meaningful short code suggestions

### 🛠 MCP Integration
- **Tool-based Architecture**: Modular AI tools for different functions
- **Extensible Design**: Easy to add new AI capabilities
- **API Integration**: Uses existing service APIs rather than direct DB access

## Architecture

```
Frontend (React) 
    ↓ 
API Gateway 
    ↓
AI Assistant Service (Gemini MCP)
    ↓ (Privacy-aware DB access)
Analytics DB ← MongoDB (Full Access)
Redirect DB ← MongoDB (Full Access)  
Notification DB ← MongoDB (Full Access)
Auth DB ← MongoDB (Limited Access - No PII)
```

## API Endpoints

### AI Tools
- `GET /api/ai/tools` - Get available AI tools
- `POST /api/ai/execute` - Execute a specific AI tool

### AI Analysis
- `POST /api/ai/analyze/url` - Analyze URL performance with AI insights
- `GET /api/ai/analyze/users` - Analyze user behavior patterns (anonymized)
- `GET /api/ai/detect/anomalies` - Detect system anomalies

### AI Insights
- `GET /api/ai/insights/system` - Get comprehensive system insights
- `POST /api/ai/suggestions/url` - Generate smart URL suggestions

### Chat Interface
- `POST /api/chat/query` - Process natural language queries

### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/deep` - Deep health check with dependencies

## Installation

### Prerequisites
- Node.js 18+
- Google Gemini API key
- Access to MongoDB clusters
- JWT secret for authentication

### Setup
```bash
cd src/AIAssistantService
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

### Docker
```bash
docker build -t ai-assistant-service .
docker run -p 5006:3000 --env-file .env ai-assistant-service
```

## Configuration

See `ENV_README.md` for detailed environment variable configuration.

### Key Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
MONGODB_ANALYTICS_URI=mongodb://...
MONGODB_REDIRECT_URI=mongodb://...
MONGODB_NOTIFICATION_URI=mongodb://...
MONGODB_AUTH_URI=mongodb://...
PRIVACY_ENABLE_USER_DATA=false
PRIVACY_HASH_USER_IDS=true
```

## Usage Examples

### Analyze URL Performance
```bash
curl -X POST http://localhost:5006/api/ai/analyze/url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shortCode": "abc123", "timeRange": "7d"}'
```

### Get System Insights
```bash
curl -X GET "http://localhost:5006/api/ai/insights/system?timeRange=30d" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Chat Query
```bash
curl -X POST http://localhost:5006/api/chat/query \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "What are my top performing URLs this week?"}'
```

### Generate URL Suggestions
```bash
curl -X POST http://localhost:5006/api/ai/suggestions/url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com/blog/post", "context": "Marketing campaign"}'
```

## Privacy & Security

### Data Access Policy
- ✅ **Analytics Data**: Full access (already anonymized)
- ✅ **URL Data**: Full access (contains userId but no PII)
- ✅ **Notification Data**: Full access (system notifications)
- ⚠️ **Auth Data**: Limited access (excludes passwords, emails, names)

### Security Features
- JWT-based authentication
- Rate limiting (10 AI requests per minute)
- Request ID tracing
- Comprehensive audit logging
- User data hashing
- Configurable privacy controls

## Development

### Adding New AI Tools
1. Add tool definition to `GeminiMCPService.initializeTools()`
2. Implement handler method
3. Update API documentation
4. Add tests

### Example Tool Implementation
```javascript
{
  name: "my_new_tool",
  description: "Description of what the tool does",
  parameters: {
    type: "object",
    properties: {
      param1: { type: "string", description: "Parameter description" }
    },
    required: ["param1"]
  },
  handler: this.myNewToolHandler.bind(this)
}
```

## Integration with Frontend

The AI Assistant Service can be integrated into your React frontend:

```typescript
// Add to src/WebUI/src/services/api.ts
export const aiAPI = {
  analyzeUrl: (shortCode: string, timeRange: string) =>
    api.post('/ai/analyze/url', { shortCode, timeRange }),
  
  getSystemInsights: (timeRange: string) =>
    api.get(`/ai/insights/system?timeRange=${timeRange}`),
  
  chatQuery: (query: string) =>
    api.post('/chat/query', { query }),
  
  generateUrlSuggestions: (originalUrl: string, context?: string) =>
    api.post('/ai/suggestions/url', { originalUrl, context })
};
```

## Monitoring & Logging

- All requests are logged with request IDs
- AI usage is tracked for cost monitoring
- Health checks monitor service dependencies
- Error handling with structured error responses

## Cost Management

- Rate limiting prevents excessive AI usage
- Caching reduces redundant AI calls
- Configurable token limits
- Usage monitoring and alerts

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure privacy compliance
5. Test with real data (anonymized)

## License

MIT License - see LICENSE file for details.