# Day 13 - MongoDB CRUD API

A Node.js + Express REST API in TypeScript that uses MongoDB via Mongoose for persistent CRUD operations on an Item/Product resource.

## 🎯 Learning Goals

- Set up MongoDB with Mongoose in a TypeScript project
- Implement persistent CRUD operations
- Handle MongoDB ObjectId validation
- Use Mongoose schemas with TypeScript interfaces
- Implement proper error handling for database operations
- Structure a scalable Node.js API with services layer

## 📁 Project Structure

```
day13-mongo-crud/
├── src/
│   ├── server.ts              # Entry point
│   ├── app.ts                 # Express app + middleware
│   ├── db.ts                  # MongoDB connection + graceful handling
│   ├── controllers/
│   │   └── itemController.ts  # Request handlers
│   ├── models/
│   │   └── Item.ts            # Mongoose schema + TypeScript interface
│   ├── services/
│   │   └── itemService.ts     # Business logic using Mongoose
│   ├── routes/
│   │   ├── items.ts           # Item CRUD routes
│   │   └── misc.ts            # Health/seed/stats routes
│   ├── middlewares/
│   │   ├── errorHandler.ts    # Global error handling
│   │   └── validateObjectId.ts # ObjectId validation middleware
│   └── utils/
│       └── createSampleData.ts # Database seeder
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB (local installation or MongoDB Atlas account)

### Installation

1. **Navigate to the project folder:**
   ```bash
   cd day13-mongo-crud
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your MongoDB connection string:
   ```
   # For local MongoDB
   MONGODB_URI=mongodb://localhost:27017/day13-mongo-crud
   
   # For MongoDB Atlas
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Seed the database (optional):**
   ```bash
   curl -X POST http://localhost:3000/api/seed
   ```

## 📡 API Endpoints

### Items CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | Get all items (paginated) |
| GET | `/api/items/:id` | Get item by ID |
| POST | `/api/items` | Create new item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |
| GET | `/api/items/search?q=query` | Search items by name |

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with DB status |
| POST | `/api/seed` | Seed database with sample data |
| GET | `/api/stats` | Get database statistics |
| DELETE | `/api/clear` | Clear all items |

## 📋 Usage Examples

### Create an Item
```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "quantity": 10, "price": 999.99}'
```

### Get All Items (with pagination)
```bash
curl "http://localhost:3000/api/items?page=1&limit=10&sortBy=price&sortOrder=asc"
```

### Get Single Item
```bash
curl http://localhost:3000/api/items/6575a1234567890abcdef123
```

### Update an Item
```bash
curl -X PUT http://localhost:3000/api/items/6575a1234567890abcdef123 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 15, "price": 899.99}'
```

### Delete an Item
```bash
curl -X DELETE http://localhost:3000/api/items/6575a1234567890abcdef123
```

### Search Items
```bash
curl "http://localhost:3000/api/items/search?q=laptop"
```

### Seed Database
```bash
# Add sample data (fails if data exists)
curl -X POST http://localhost:3000/api/seed

# Clear and seed
curl -X POST "http://localhost:3000/api/seed?clear=true"
```

## 📦 Item Schema

```typescript
interface Item {
  id: string;           // MongoDB ObjectId
  name: string;         // Required, 2-100 characters
  quantity: number;     // Required, min: 0
  price: number;        // Required, min: 0
  createdAt: Date;      // Auto-generated
  updatedAt: Date;      // Auto-updated
}
```

## 🔧 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint (optional) |

## 🏗️ Architecture

### Layer Structure

1. **Routes** - Define API endpoints and link to controllers
2. **Controllers** - Handle HTTP requests/responses
3. **Services** - Business logic and database operations
4. **Models** - Mongoose schemas and TypeScript interfaces
5. **Middlewares** - Cross-cutting concerns (error handling, validation)

### Error Handling

The API includes comprehensive error handling for:
- Mongoose validation errors
- Invalid ObjectId format
- Duplicate key errors
- Not found errors
- General server errors

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "details": ["Optional array of error details"]
  }
}
```

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |

## 📚 Key Concepts Covered

- **Mongoose Connection**: Connecting to MongoDB with graceful shutdown handling
- **Schema Definition**: Creating Mongoose schemas with validation
- **TypeScript Integration**: Using interfaces with Mongoose documents
- **CRUD Operations**: Create, Read, Update, Delete with Mongoose
- **Pagination**: Implementing cursor-based pagination
- **Error Handling**: Centralized error handling middleware
- **ObjectId Validation**: Middleware to validate MongoDB ObjectIds
- **Service Layer**: Separating business logic from controllers

## 🎓 Next Steps

- Add authentication with JWT (Day 12 integration)
- Implement request validation with Joi or Zod
- Add unit and integration tests
- Set up Docker containerization
- Implement caching with Redis
