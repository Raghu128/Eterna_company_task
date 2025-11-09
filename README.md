# Order Execution Engine

A high-performance DEX order execution engine with real-time WebSocket updates, intelligent routing between Raydium and Meteora DEXs, and concurrent order processing.

## 🌐 Live Demo

**🚀 Live Application**: https://order-execution-engine-h86v.onrender.com

**📦 GitHub Repository**: https://github.com/Raghu128/Eternal_company_task

**🎥 Demo Video**: [Will be added after recording]

### Try it now:
```bash
# Health Check
curl https://order-execution-engine-h86v.onrender.com/api/health

# Submit Order
curl -X POST https://order-execution-engine-h86v.onrender.com/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"tokenIn":"SOL","tokenOut":"USDC","amountIn":100,"orderType":"market"}'
```

---

## 🎯 Overview

This system processes market orders by:
1. **Fetching quotes** from both Raydium and Meteora DEXs in parallel
2. **Comparing prices** and routing to the DEX with better execution
3. **Executing trades** with slippage protection
4. **Streaming live updates** via WebSocket for order lifecycle
5. **Handling failures** with exponential backoff retry logic

### Why Market Orders?

**Market orders** were chosen for this implementation because they:
- Execute immediately at current market price
- Require simpler logic (no price monitoring needed like limit orders)
- Demonstrate the core routing and execution flow clearly
- Are the most common order type in DEX trading

### Extensibility to Other Order Types

The engine can be extended to support:

**Limit Orders**: Add a price monitoring service that continuously checks market prices and triggers execution when target price is reached. The existing routing and execution logic can be reused.

**Sniper Orders**: Integrate with token launch event listeners (e.g., Raydium pool creation events) and trigger execution immediately when a new pool is detected. The execution path remains identical.

The modular architecture (separate routing, queue, and execution layers) makes adding new order types straightforward.

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP POST /api/orders/execute
       ▼
┌─────────────────────────────────────┐
│         Fastify Server              │
│  ┌──────────────────────────────┐  │
│  │   Order Routes Handler        │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │   WebSocket Service          │◄─┼─── Redis Pub/Sub
│  └──────────────────────────────┘  │
└───────────┬─────────────────────────┘
            │
            ▼
┌───────────────────────────┐
│     PostgreSQL DB         │
│  - orders                 │
│  - execution_history      │
│  - dex_quotes             │
│  - retry_log              │
└───────────────────────────┘
            │
            ▼
┌───────────────────────────┐
│      BullMQ Queue         │◄─── Redis
│  - 10 concurrent workers  │
│  - 100 orders/min limit   │
│  - Exponential backoff    │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│    Order Worker           │
│  ┌────────────────────┐   │
│  │ 1. Routing         │   │
│  │ 2. Building        │   │
│  │ 3. Submitting      │   │
│  │ 4. Confirming      │   │
│  └────────┬───────────┘   │
│           │               │
│           ▼               │
│  ┌────────────────────┐   │
│  │  Mock DEX Router   │   │
│  │  - Raydium         │   │
│  │  - Meteora         │   │
│  │  - Price Compare   │   │
│  └────────────────────┘   │
└───────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd order-execution-engine

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Start Redis (if not running)
redis-server

# Start PostgreSQL (if not running)
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Start the development server
npm run dev
```

The server will start at `http://localhost:3000`

---

## 📡 API Documentation

### 1. Submit Order

**Endpoint:** `POST /api/orders/execute`

**Request Body:**
```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 100,
  "orderType": "market",
  "slippage": 0.01
}
```

**Response:**
```json
{
  "orderId": "ORD-xK2p9qL3vR8n",
  "status": "pending",
  "message": "Order submitted successfully. Connect via WebSocket for updates.",
  "websocketUrl": "/api/orders/ORD-xK2p9qL3vR8n/stream"
}
```

### 2. Stream Order Updates (WebSocket)

**Endpoint:** `WS /api/orders/:orderId/stream`

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3000/api/orders/ORD-xK2p9qL3vR8n/stream');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(update);
};
```

**Status Updates:**
```json
// 1. Initial connection
{
  "orderId": "ORD-xK2p9qL3vR8n",
  "status": "pending",
  "message": "Order received and queued",
  "timestamp": "2024-01-15T10:30:00Z"
}

// 2. Routing
{
  "orderId": "ORD-xK2p9qL3vR8n",
  "status": "routing",
  "message": "Comparing prices from Raydium and Meteora",
  "timestamp": "2024-01-15T10:30:01Z"
}

// 3. Building
{
  "orderId": "ORD-xK2p9qL3vR8n",
  "status": "building",
  "message": "Building transaction for meteora",
  "data": {
    "selectedDex": "meteora",
    "estimatedOutput": 99.8,
    "fee": 0.002
  },
  "timestamp": "2024-01-15T10:30:02Z"
}

// 4. Submitted
{
  "orderId": "ORD-xK2p9qL3vR8n",
  "status": "submitted",
  "message": "Transaction submitted to blockchain",
  "timestamp": "2024-01-15T10:30:03Z"
}

// 5. Confirmed
{
  "orderId": "ORD-xK2p9qL3vR8n",
  "status": "confirmed",
  "message": "Transaction confirmed successfully",
  "data": {
    "txHash": "5J7z...",
    "executedPrice": 0.0099,
    "amountOut": 99.5,
    "dex": "meteora"
  },
  "timestamp": "2024-01-15T10:30:05Z"
}
```

### 3. Get Order Details

**Endpoint:** `GET /api/orders/:orderId`

**Response:**
```json
{
  "orderId": "ORD-xK2p9qL3vR8n",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 100,
  "orderType": "market",
  "status": "confirmed",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:05Z"
}
```

### 4. List Recent Orders

**Endpoint:** `GET /api/orders?limit=50`

**Response:**
```json
{
  "orders": [...],
  "count": 50
}
```

### 5. Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "queue": {
    "waiting": 5,
    "active": 10,
    "completed": 234,
    "failed": 3,
    "total": 252
  },
  "websocket": {
    "activeOrders": 15,
    "totalConnections": 23
  }
}
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch
```

**Test Coverage:**
- ✅ Mock DEX Router (8 tests)
- ✅ Helper Functions (11 tests)
- ✅ Order Queue (2 tests)
- ✅ Order Routes (6 tests)
- **Total: 27+ unit and integration tests**

---

## 🔄 DEX Routing Logic

The system implements intelligent routing:

1. **Parallel Quote Fetching**: Queries both DEXs simultaneously
2. **Price Comparison**: Compares estimated output after fees
3. **Best Execution**: Routes to DEX with highest output amount
4. **Logging**: Records all quotes and routing decisions

**Example Routing Decision:**
```
Raydium: 
  Price: 0.0099 | Fee: 0.3% | Output: 99.7 USDC

Meteora: 
  Price: 0.0100 | Fee: 0.2% | Output: 99.8 USDC ✓ SELECTED

Price Difference: 1.01%
```

---

## ⚡ Queue & Concurrency

- **Max Concurrent Workers**: 10 orders processing simultaneously
- **Rate Limit**: 100 orders per minute
- **Retry Logic**: Exponential backoff (1s → 2s → 4s)
- **Max Retries**: 3 attempts before marking as failed
- **Queue Persistence**: Jobs saved in Redis, survives restarts

---

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

**Services:**
- `app`: Node.js application
- `postgres`: PostgreSQL database
- `redis`: Redis for queue and pub/sub

---

## 🌐 Deployment

### Render.com (Free Hosting)

1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Add all variables from `.env.example`
5. Add PostgreSQL and Redis from Render Dashboard
6. Deploy!

**Live URL**: Will be available after deployment

---

## 📊 Monitoring

### Logs

All actions are logged with structured logging:
```
[INFO] Order submitted: orderId=ORD-123, tokenIn=SOL, tokenOut=USDC
[INFO] DEX routing decision: selected=meteora, priceDiff=1.2%
[INFO] Swap executed: orderId=ORD-123, txHash=5J7z..., dex=meteora
```

### Metrics

Monitor via `/api/health` endpoint:
- Queue depth and processing rate
- Active WebSocket connections
- Order success/failure rates

---

## 🎥 Demo Video

**YouTube Link**: [Will be uploaded]

**Demo includes:**
- 5 simultaneous order submissions
- Live WebSocket status updates
- DEX routing decisions in console
- Queue processing visualization

---

## 📦 Project Structure

```
order-execution-engine/
├── src/
│   ├── config/           # Configuration management
│   ├── database/         # Database models & migrations
│   │   ├── models/
│   │   ├── pool.ts
│   │   └── migrate.ts
│   ├── dex/              # DEX integration
│   │   └── mock-dex-router.ts
│   ├── queue/            # BullMQ queue system
│   │   ├── redis.ts
│   │   ├── order-queue.ts
│   │   └── order-worker.ts
│   ├── routes/           # API routes
│   │   └── order.routes.ts
│   ├── services/         # Business logic
│   │   └── websocket.service.ts
│   ├── types/            # TypeScript types
│   ├── utils/            # Helper functions
│   ├── __tests__/        # Test files
│   └── server.ts         # Main application
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Configuration

All configuration is managed via environment variables (`.env`):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `REDIS_HOST` | Redis hostname | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | order_execution_db |
| `MAX_CONCURRENT_ORDERS` | Concurrent workers | 10 |
| `ORDERS_PER_MINUTE` | Rate limit | 100 |
| `MAX_RETRIES` | Max retry attempts | 3 |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- Raydium SDK Documentation
- Meteora API Documentation
- Solana Web3.js
- BullMQ for queue management
- Fastify for WebSocket support

---

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

**Built with ❤️ for efficient DEX order execution**

