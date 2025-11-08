# Deployment Guide

## 🐳 Docker Deployment (Recommended)

### Quick Start with Docker Compose

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd order-execution-engine

# 2. Start all services
docker-compose up -d

# 3. Check service status
docker-compose ps

# 4. View logs
docker-compose logs -f app

# 5. Run migrations
docker-compose exec app npm run migrate

# 6. Test the service
curl http://localhost:3000/api/health
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

---

## ☁️ Cloud Deployment Options

### Option 1: Render.com (Free Tier Available)

**Step 1: Create PostgreSQL Database**
1. Go to [render.com](https://render.com)
2. Click "New +" → "PostgreSQL"
3. Name: `order-execution-db`
4. Plan: Free
5. Note the Internal Database URL

**Step 2: Create Redis Instance**
1. Click "New +" → "Redis"
2. Name: `order-execution-redis`
3. Plan: Free
4. Note the Internal Redis URL

**Step 3: Deploy Application**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `order-execution-engine`
   - **Environment**: Docker
   - **Plan**: Free
   - **Dockerfile Path**: `./Dockerfile`
   
4. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=3000
   REDIS_HOST=<your-redis-internal-url>
   REDIS_PORT=6379
   DB_HOST=<your-postgres-internal-host>
   DB_PORT=5432
   DB_NAME=order_execution_db
   DB_USER=<your-db-user>
   DB_PASSWORD=<your-db-password>
   MAX_CONCURRENT_ORDERS=10
   ORDERS_PER_MINUTE=100
   MAX_RETRIES=3
   ```

5. Click "Create Web Service"

**Step 4: Run Migrations**
1. Go to Shell tab in Render dashboard
2. Run: `npm run migrate`

**Step 5: Access Your Application**
- Your app will be available at: `https://your-app-name.onrender.com`

---

### Option 2: Railway.app

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL
railway add postgresql

# 5. Add Redis
railway add redis

# 6. Deploy
railway up

# 7. Set environment variables
railway variables set NODE_ENV=production
railway variables set MAX_CONCURRENT_ORDERS=10
# ... add other variables

# 8. Open application
railway open
```

---

### Option 3: Fly.io

**Step 1: Install Fly CLI**
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login
```

**Step 2: Create fly.toml**
```toml
app = "order-execution-engine"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

**Step 3: Deploy**
```bash
# Initialize
flyctl launch

# Create PostgreSQL
flyctl postgres create

# Create Redis
flyctl redis create

# Deploy
flyctl deploy

# Check status
flyctl status

# View logs
flyctl logs
```

---

### Option 4: Heroku

```bash
# 1. Install Heroku CLI
brew install heroku/brew/heroku

# 2. Login
heroku login

# 3. Create application
heroku create order-execution-engine

# 4. Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# 5. Add Redis
heroku addons:create heroku-redis:mini

# 6. Set buildpack
heroku buildpacks:set heroku/nodejs

# 7. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MAX_CONCURRENT_ORDERS=10
# ... add other variables

# 8. Deploy
git push heroku main

# 9. Run migrations
heroku run npm run migrate

# 10. Open application
heroku open
```

---

## 🔧 Environment Variables for Production

**Required Variables:**
```bash
NODE_ENV=production
PORT=3000

# Redis
REDIS_HOST=<redis-host>
REDIS_PORT=6379

# PostgreSQL
DB_HOST=<postgres-host>
DB_PORT=5432
DB_NAME=order_execution_db
DB_USER=<username>
DB_PASSWORD=<password>

# Queue
MAX_CONCURRENT_ORDERS=10
ORDERS_PER_MINUTE=100

# Retry
MAX_RETRIES=3
INITIAL_RETRY_DELAY=1000

# DEX (Mock)
MOCK_EXECUTION_DELAY=2500
PRICE_VARIANCE=0.05
```

---

## 📊 Monitoring in Production

### Health Check Endpoint

```bash
# Check service health
curl https://your-app-url.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "queue": {
    "waiting": 5,
    "active": 10,
    "completed": 234,
    "failed": 3
  },
  "websocket": {
    "activeOrders": 15,
    "totalConnections": 23
  }
}
```

### Logging

All platforms provide log viewing:

**Render**: Dashboard → Logs tab  
**Railway**: `railway logs`  
**Fly.io**: `flyctl logs`  
**Heroku**: `heroku logs --tail`

---

## 🚀 Performance Optimization for Production

### 1. Database Connection Pooling

Already configured in `src/database/pool.ts`:
```javascript
max: 20,                      // Max connections
idleTimeoutMillis: 30000,     // Close idle after 30s
connectionTimeoutMillis: 2000 // Connection timeout
```

### 2. Redis Persistence

Redis is configured with AOF persistence:
```bash
appendonly yes
```

### 3. Worker Concurrency

Adjust based on your hosting plan:
```bash
# For 512MB RAM: MAX_CONCURRENT_ORDERS=5
# For 1GB RAM: MAX_CONCURRENT_ORDERS=10
# For 2GB+ RAM: MAX_CONCURRENT_ORDERS=15-20
```

### 4. Rate Limiting

Configured to handle:
- 100 orders per minute
- 10 concurrent orders
- Adjust based on your needs

---

## 🔒 Security Considerations

### 1. Environment Variables

**Never commit** `.env` file. Use platform-specific secrets:

- **Render**: Dashboard → Environment → Environment Variables
- **Railway**: `railway variables`
- **Fly.io**: `flyctl secrets set KEY=value`
- **Heroku**: `heroku config:set KEY=value`

### 2. Database Security

- Use strong passwords
- Enable SSL connections in production
- Restrict database access to application only

### 3. API Security (Optional Enhancements)

Consider adding:
- Rate limiting per IP
- API key authentication
- CORS configuration
- Request validation

---

## 📈 Scaling Strategies

### Horizontal Scaling

```bash
# Render
# Dashboard → Settings → Instance Count

# Railway
railway scale --replicas 3

# Fly.io
flyctl scale count 3

# Heroku
heroku ps:scale web=3
```

### Database Scaling

- Upgrade to paid PostgreSQL plan
- Enable connection pooling
- Add read replicas for heavy read workloads

### Redis Scaling

- Upgrade to paid Redis plan
- Enable persistence
- Consider Redis Cluster for high availability

---

## 🧪 Testing Production Deployment

```bash
# 1. Health check
curl https://your-app-url.com/api/health

# 2. Submit test order
curl -X POST https://your-app-url.com/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 100,
    "orderType": "market"
  }'

# 3. Check order status
curl https://your-app-url.com/api/orders/{orderId}

# 4. Connect to WebSocket (use wscat)
wscat -c wss://your-app-url.com/api/orders/{orderId}/stream
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check database is accessible
psql $DATABASE_URL

# Run migrations
npm run migrate

# Check connection pool settings
```

### Redis Connection Issues

```bash
# Check Redis is accessible
redis-cli -u $REDIS_URL ping

# Expected: PONG
```

### Worker Not Processing Jobs

```bash
# Check worker logs
# Look for: "Order worker started"

# Check Redis queue
redis-cli
> LLEN bull:order-execution:wait
> LLEN bull:order-execution:active
```

### WebSocket Connection Fails

```bash
# Ensure WebSocket upgrade is allowed
# Check platform documentation for WebSocket support

# Test with wscat
npm install -g wscat
wscat -c ws://localhost:3000/api/orders/{orderId}/stream
```

---

## 📞 Support

For deployment issues:
1. Check service logs first
2. Verify all environment variables are set
3. Ensure database migrations ran successfully
4. Check health endpoint response

**Platform-specific support:**
- Render: https://render.com/docs
- Railway: https://docs.railway.app
- Fly.io: https://fly.io/docs
- Heroku: https://devcenter.heroku.com

---

**Happy Deploying! 🚀**

