# Day 16 – Inventory Microservice

A Node.js + Express + TypeScript microservice for managing inventory items using MongoDB (Mongoose).

## 🚀 Overview

This service manages inventory items with support for:

- Creating, reading, updating, and deleting inventory items
- Listing items with filters and pagination
- Adjusting quantity of items (with negative quantities prevented)
- Fetching low-stock items based on thresholds

## 📁 Project Structure

```bash
day16-inventory-service/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── server.ts
    ├── app.ts
    ├── db.ts
    ├── models/
    │   └── InventoryItem.ts
    ├── controllers/
    │   └── inventoryController.ts
    ├── services/
    │   └── inventoryService.ts
    ├── routes/
    │   └── inventory.ts
    ├── middlewares/
    │   └── errorHandler.ts
    ├── utils/
    │   └── validators.ts
    └── types/
        └── index.d.ts
```

## 🔧 Setup

1. **Go to the project folder**

```bash
cd day16-inventory-service
```

2. **Install dependencies**

```bash
npm install
```

3. **Create `.env` from example**

```bash
cp .env.example .env
```

4. **Edit `.env`**

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/day16inventory
```

5. **Run in development mode**

```bash
npm run dev
```

Server runs at: `http://localhost:3000`

## 🧱 Inventory Item Model

```ts
type InventoryStatus = 'available' | 'reserved' | 'damaged' | 'sold';

interface IInventoryItem {
  productName: string;
  batchId?: string;
  sku?: string;
  quantity: number;
  unit: string;
  location: string;
  supplier?: string;
  status: InventoryStatus;
  minThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 📡 API Endpoints

Base path: `/api/inventory`

### 1. Create Item

**POST** `/api/inventory`

**Body**

```json
{
  "productName": "Laptop",
  "batchId": "BATCH-001",
  "sku": "LAP-123",
  "quantity": 10,
  "unit": "pcs",
  "location": "Warehouse A",
  "supplier": "Tech Corp",
  "status": "available",
  "minThreshold": 5
}
```

**Response**

```json
{
  "success": true,
  "data": { "_id": "...", "productName": "Laptop", "quantity": 10, ... }
}
```

### 2. List Items

**GET** `/api/inventory`

Query params:

- `page` (default: 1)
- `limit` (default: 20)
- `productName`
- `supplier`
- `location`

```bash
curl "http://localhost:3000/api/inventory?page=1&limit=20&productName=laptop"
```

**Response**

```json
{
  "success": true,
  "data": [ ...items... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

### 3. Get Single Item

**GET** `/api/inventory/:id`

```bash
curl http://localhost:3000/api/inventory/<ITEM_ID>
```

### 4. Update Item

**PUT** `/api/inventory/:id`

```bash
curl -X PUT http://localhost:3000/api/inventory/<ITEM_ID> \
  -H "Content-Type: application/json" \
  -d '{ "quantity": 15, "status": "reserved" }'
```

### 5. Delete Item

**DELETE** `/api/inventory/:id`

```bash
curl -X DELETE http://localhost:3000/api/inventory/<ITEM_ID>
```

**Response**: `204 No Content`

### 6. Adjust Quantity

**POST** `/api/inventory/:id/adjust`

Body:

```json
{
  "delta": -2
}
```

- `delta` can be positive or negative (integer)
- Negative adjustments that would result in a negative quantity are rejected

```bash
curl -X POST http://localhost:3000/api/inventory/<ITEM_ID>/adjust \
  -H "Content-Type: application/json" \
  -d '{ "delta": -2 }'
```

**Response**

```json
{
  "success": true,
  "data": { "_id": "...", "quantity": 8, ... }
}
```

### 7. Low-Stock Items

**GET** `/api/inventory/low-stock`

Optional query:

- `threshold` – use this numeric value instead of per-item `minThreshold`

```bash
# Using each item's minThreshold
curl http://localhost:3000/api/inventory/low-stock

# Using a global threshold of 10
curl "http://localhost:3000/api/inventory/low-stock?threshold=10"
```

**Response**

```json
{
  "success": true,
  "data": [ ...lowStockItems... ]
}
```

## 🧪 Validation

Basic validation is implemented in `src/utils/validators.ts`:

- `validateInventoryInput(data)` – checks required fields and types
- `validateObjectId(id)` – helper for verifying MongoDB ObjectId format

## 🧠 What You Learn on Day 16

- Designing a small, focused microservice
- Modeling inventory entities with Mongoose
- Implementing CRUD and domain-specific actions (quantity adjustment, low-stock)
- Adding pagination and filters to list endpoints
- Centralizing validation and error handling

## ✅ Next Steps

- Add authentication and authorization
- Add more complex filters (date ranges, status)
- Integrate with other services (orders, shipping)
- Add tests (unit & integration) and CI
