# Credit Engine API

A lightweight API service that issues and tracks "thank-you" credits for ecosystem interactions including tech modules, social posts, referrals, spend multipliers, coffee-wall actions, and more.

## Features

- 🎯 **Credit Tracking**: Award and track credits for various user actions
- 🔄 **Referral System**: Automatic referral bonus calculation and awarding
- 📊 **Analytics**: User credit summaries and system-wide statistics
- 🔒 **Security**: Rate limiting, input validation, and error handling
- 📱 **API-First**: RESTful endpoints with comprehensive documentation
- 🚀 **Scalable**: MongoDB for data persistence with efficient indexing

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd credit-engine
```

2. Install dependencies:
```bash
npm install
```

3. Environment setup:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/credit-engine?retryWrites=true&w=majority
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## API Endpoints

### Core Endpoints (Required)

#### POST /api/enroll
Enroll a user and award enrollment credits with optional referral bonus.

**Request Body:**
```json
{
  "userId": "user123",
  "referrerId": "referrer456", // optional
  "creditsAwarded": 100,       // optional, defaults to 100
  "actionType": "enrollment",  // optional
  "metadata": {}               // optional
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user123",
  "creditsAwarded": 100,
  "actionType": "enrollment",
  "eventId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "message": "Credit event recorded: 100 credits awarded to user123",
  "referral": {
    "referrerId": "referrer456",
    "bonusAwarded": 20,
    "bonusMessage": "Referral bonus of 20 credits awarded to referrer456"
  }
}
```

#### GET /api/credits/:userId
Get credit totals and summary for a specific user.

**Query Parameters:**
- `includeEvents=true` - Include recent credit events
- `includeReferrals=true` - Include referral bonus summary

**Response:**
```json
{
  "success": true,
  "userId": "user123",
  "totalCredits": 350,
  "totalEvents": 12,
  "creditsByAction": {
    "enrollment": { "count": 1, "totalCredits": 100 },
    "social_post": { "count": 5, "totalCredits": 150 },
    "referral_bonus": { "count": 2, "totalCredits": 100 }
  },
  "lastActivity": "2024-01-15T10:30:00.000Z",
  "recentEvents": [...]
}
```

### Additional Endpoints

#### POST /api/credits
Award credits for various actions.

#### GET /api/credits/:userId/events
Get paginated credit events for a user.

#### GET /api/credits/:userId/referrals
Get referral bonus summary for a user.

#### GET /api/credits/system/stats
Get system-wide credit statistics.

#### GET /health
Health check endpoint.

## Action Types

The system supports the following action types:

- `enrollment` - User registration/enrollment (20% referral bonus)
- `social_post` - Social media interactions (10% referral bonus)
- `tech_module` - Technical module completion (15% referral bonus)
- `spend_multiplier` - Purchase multiplier actions (25% referral bonus)
- `coffee_wall` - Coffee wall interactions (5% referral bonus)
- `referral_bonus` - Automatic referral bonuses
- `other` - Custom actions (10% referral bonus)

## Architecture

### Core Modules

#### Module 5: Referral Service (`src/services/referralService.js`)
- Calculates referral bonuses based on action type
- Validates referrer eligibility
- Processes referral bonus awards
- Provides referral analytics

#### Module 6: Ledger Service (`src/services/ledgerService.js`)
- Records credit events to MongoDB
- Retrieves user credit totals and history
- Provides filtering and pagination
- Generates system statistics

### Database Schema

**CreditEvent Collection:**
```javascript
{
  userId: String,           // Required
  actionType: String,       // Enum of valid action types
  creditsAwarded: Number,   // Credits awarded for this event
  referrerBonus: Number,    // Bonus awarded to referrer
  referrerId: String,       // Optional referrer ID
  timestamp: Date,          // Auto-generated
  metadata: Object          // Optional additional data
}
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm start
```

### MongoDB Setup

1. Create a MongoDB Atlas cluster
2. Create a database named `credit-engine`
3. Get your connection string
4. Add to environment variables

## Development

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm start
```

## API Documentation

Full API documentation is available at the root endpoint:
- Local: `http://localhost:3000/`
- Production: `https://your-domain.vercel.app/`

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional details (development only)"
}
```

## Rate Limiting

- 1000 requests per 15 minutes per IP
- Configurable via environment variables

## Security Features

- Helmet.js for security headers
- Input validation and sanitization
- Rate limiting protection
- CORS configuration
- Error message sanitization in production

## Performance

- MongoDB indexes for efficient queries
- Connection pooling
- Request/response compression
- Pagination for large datasets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License

---

**Tech Assessment Submission**
- Modules 5 & 6 implemented as specified
- All required endpoints functional
- MongoDB integration complete
- Ready for deployment and testing 