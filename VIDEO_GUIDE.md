# Video Demo Recording Guide

## 🎥 Video Requirements

Create a **1-2 minute video** demonstrating:
1. Order flow through your system
2. Design decisions explanation
3. Submitting 3-5 orders simultaneously
4. WebSocket showing all status updates (pending → routing → confirmed)
5. DEX routing decisions in logs/console
6. Queue processing multiple orders

---

## 📋 Recording Checklist

### Before Recording

- [ ] Ensure all services are running (PostgreSQL, Redis, App)
- [ ] Clear previous orders from database (optional, for clean demo)
- [ ] Open necessary windows:
  - Terminal with server logs
  - Browser with WebSocket client or Postman
  - Browser with API testing tool
- [ ] Test everything works before recording

### Recording Setup

**Tools you can use:**
- **Screen Recording**: 
  - macOS: QuickTime Player (File → New Screen Recording)
  - Windows: OBS Studio (free)
  - Linux: SimpleScreenRecorder
- **Video Editing**: iMovie, DaVinci Resolve (free), or upload raw footage

---

## 🎬 Suggested Recording Script

### Opening (10 seconds)

```
"Hi! This is the Order Execution Engine - a DEX trading system 
that routes orders between Raydium and Meteora for best execution."
```

**Show**: Application running, terminal with logs

---

### Part 1: Architecture Overview (20 seconds)

```
"The system uses:
- Fastify for HTTP and WebSocket
- BullMQ with Redis for concurrent order processing
- PostgreSQL for order persistence
- Mock DEX router that compares Raydium and Meteora prices"
```

**Show**: Briefly show code structure or architecture diagram

---

### Part 2: Submit Multiple Orders (30 seconds)

```
"Let me submit 5 orders simultaneously to demonstrate 
concurrent processing..."
```

**Actions**:
1. Open Postman or your API client
2. Show the order submission endpoint
3. Submit 5 orders quickly (or use Postman Runner)
4. Show the responses with different orderIds

**Show in terminal**:
```
[INFO] Order submitted: orderId=ORD-abc123
[INFO] Order added to queue
[INFO] Order submitted: orderId=ORD-def456
...
```

---

### Part 3: WebSocket Live Updates (30 seconds)

```
"Each order streams real-time updates via WebSocket.
Watch as they go through: pending → routing → building → 
submitted → confirmed"
```

**Actions**:
1. Open WebSocket connections (5 tabs or use tool)
2. Show live status updates flowing in
3. Point out the status progression

**Example updates to highlight**:
```json
{"status": "pending", "message": "Order received"}
{"status": "routing", "message": "Comparing prices..."}
{"status": "building", "data": {"selectedDex": "meteora"}}
{"status": "confirmed", "data": {"txHash": "...", "amountOut": 99.5}}
```

---

### Part 4: DEX Routing Decisions (20 seconds)

```
"In the logs, you can see the DEX router comparing prices
and selecting the best venue for each trade."
```

**Show in terminal**:
```
[INFO] Fetching quotes from both DEXs
[DEBUG] Raydium quote: price=0.0099, output=99.7
[DEBUG] Meteora quote: price=0.0100, output=99.8
[INFO] DEX routing decision: selected=meteora, priceDiff=1.2%
```

---

### Part 5: Queue Processing (20 seconds)

```
"The queue processes 10 orders concurrently with a limit
of 100 per minute. Failed orders retry with exponential backoff."
```

**Show in terminal**:
```
[INFO] Order worker started: concurrency=10, rateLimit=100/min
[INFO] Processing order: orderId=ORD-123, attempt=1
[INFO] Worker completed job
```

**Also show**:
- Health endpoint with queue metrics
- Multiple orders completing simultaneously

---

### Closing (10 seconds)

```
"The system successfully processed all 5 orders, routing them
to the best DEX based on price comparison. All orders were 
confirmed with transaction hashes. Thanks for watching!"
```

**Show**: Final status of all orders (confirmed), health check endpoint

---

## 🛠️ Setting Up for Recording

### Terminal Setup

```bash
# Terminal 1: Start server with detailed logs
npm run dev

# Terminal 2: Monitor Redis queue
redis-cli
> LLEN bull:order-execution:wait
> LLEN bull:order-execution:active

# Terminal 3: Monitor database
psql -U postgres order_execution_db
> SELECT order_id, status FROM orders ORDER BY created_at DESC LIMIT 10;
```

### Postman Setup

1. Import `postman_collection.json`
2. Set `baseUrl` variable to `http://localhost:3000`
3. Use **Collection Runner** to submit multiple orders:
   - Select "Submit Market Order" request
   - Set iterations: 5
   - Delay: 500ms
   - Run

### WebSocket Client Setup

**Option 1: Browser Console**
```javascript
const ws1 = new WebSocket('ws://localhost:3000/api/orders/ORD-xxx1/stream');
const ws2 = new WebSocket('ws://localhost:3000/api/orders/ORD-xxx2/stream');
// ... etc

ws1.onmessage = (e) => console.log('Order 1:', JSON.parse(e.data));
ws2.onmessage = (e) => console.log('Order 2:', JSON.parse(e.data));
```

**Option 2: Use wscat**
```bash
npm install -g wscat

# In separate terminals
wscat -c ws://localhost:3000/api/orders/ORD-xxx1/stream
wscat -c ws://localhost:3000/api/orders/ORD-xxx2/stream
```

**Option 3: Use Postman WebSocket**
Postman now supports WebSocket connections!

---

## 📤 Video Upload

### YouTube (Public or Unlisted)

1. Go to [youtube.com/upload](https://youtube.com/upload)
2. Upload your video
3. Title: "Order Execution Engine - DEX Trading System Demo"
4. Description: Include GitHub repo link
5. Visibility: **Unlisted** (so only people with link can view)
6. Publish and copy the link

### Alternative: Loom

1. Sign up at [loom.com](https://loom.com) (free)
2. Record with Loom desktop app
3. Share the link

---

## 🎯 Pro Tips

1. **Practice first**: Do a dry run before recording
2. **Clear and slow**: Speak clearly, don't rush
3. **Zoom in**: Make text readable (Cmd/Ctrl + for terminal)
4. **Highlight important parts**: Use mouse cursor to point
5. **Keep it simple**: Don't overcomplicate the explanation
6. **Show results**: Always show the successful outcomes
7. **Background noise**: Record in a quiet place
8. **Video quality**: 1080p minimum

---

## ✅ Final Checklist Before Submitting

- [ ] Video is 1-2 minutes long
- [ ] Shows 3-5 simultaneous orders
- [ ] WebSocket status updates are visible
- [ ] DEX routing decisions are shown in logs
- [ ] Queue processing is demonstrated
- [ ] Audio is clear (if narrating)
- [ ] Video is uploaded and link is public
- [ ] Link is added to README.md

---

## 📝 Add Video Link to README

Once uploaded, update README.md:

```markdown
## 🎥 Demo Video

**YouTube Link**: https://youtube.com/watch?v=YOUR_VIDEO_ID

**Demo includes:**
- 5 simultaneous order submissions ✅
- Live WebSocket status updates ✅
- DEX routing decisions in console ✅
- Queue processing visualization ✅
```

---

**Good luck with your recording! 🎬**

