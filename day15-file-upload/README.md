# Day 15 – File Upload API (Multer + S3/local)

A Node.js + Express + TypeScript API for uploading files with support for both local filesystem storage and AWS S3. File metadata is stored in MongoDB via Mongoose, and all file operations are protected using JWT authentication.

## 🚀 Features

- Upload single or multiple files
- Store files either:
  - locally on disk, or
  - in AWS S3 (switch via `STORAGE_PROVIDER`)
- Store file metadata in MongoDB (`File` collection)
- List files for the authenticated user
- Download files (redirect to S3 or stream local file)
- Delete files from storage and DB
- JWT-based protection for upload/list/download/delete endpoints
- File size limits and mime-type filtering

## 📁 Project Structure

```bash
day15-file-upload/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── server.ts
    ├── app.ts
    ├── db.ts
    ├── config/
    │   └── storage.ts
    ├── models/
    │   └── File.ts
    ├── controllers/
    │   └── fileController.ts
    ├── services/
    │   ├── fileService.ts
    │   └── storageService.ts
    ├── routes/
    │   └── files.ts
    ├── middleware/
    │   ├── authenticate.ts
    │   └── multerConfig.ts
    ├── utils/
    │   └── s3Client.ts
    └── types/
        └── express.d.ts
```

## 🧩 Tech Stack

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Multer for file uploads
- AWS S3 (via aws-sdk) for cloud storage
- JWT for authentication
- CORS

## 🔧 Setup

1. **Go to the project folder**

```bash
cd day15-file-upload
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

For local-only dev mode, you can use:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/day15files
JWT_SECRET=your_jwt_secret
STORAGE_PROVIDER=local
LOCAL_UPLOAD_DIR=uploads
```

If you want to use S3, add and configure:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your_bucket
STORAGE_PROVIDER=s3
```

5. **Run in development mode**

```bash
npm run dev
```

Server runs at: `http://localhost:3000`

> Note: You must provide a valid JWT in the `Authorization` header. Tokens are assumed to have a payload with `{ id: string, email?: string }`.

## 🔐 Authentication

All file-related routes are protected using the `authenticate` middleware.

- Header format:

```http
Authorization: Bearer <your-jwt-token>
```

- `JWT_SECRET` must be set in your `.env`.
- The token payload is expected to contain at least `id` which is then exposed as `req.user.id`.

## 📦 File Model

```ts
interface IFile {
  filename: string;      // stored filename or S3 key
  originalName: string;  // original filename from the client
  mimetype: string;      // MIME type
  size: number;          // size in bytes
  url: string;           // accessible URL or path
  storage: 'local' | 's3';
  key: string;           // local filename or S3 object key
  uploadedBy: ObjectId;  // user id
  createdAt: Date;
}
```

## 📡 API Endpoints

Base path: `/api/files`

### 1. Upload Single File

**POST** `/api/files/upload`

- Protected: Yes (JWT)
- Content-Type: `multipart/form-data`
- Field name: `file`

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/file.png"
```

### 2. Upload Multiple Files

**POST** `/api/files/upload-multiple`

- Protected: Yes (JWT)
- Content-Type: `multipart/form-data`
- Field name: `files`

```bash
curl -X POST http://localhost:3000/api/files/upload-multiple \
  -H "Authorization: Bearer <TOKEN>" \
  -F "files=@/path/to/file1.png" \
  -F "files=@/path/to/file2.pdf"
```

### 3. List User Files

**GET** `/api/files`

- Protected: Yes (JWT)

```bash
curl -X GET http://localhost:3000/api/files \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Download File

**GET** `/api/files/:id`

- Protected: Yes (JWT)

Behavior:

- If storage = `s3` → redirects to S3 URL
- If storage = `local` → streams the file as a download

```bash
curl -L -X GET http://localhost:3000/api/files/<FILE_ID> \
  -H "Authorization: Bearer <TOKEN>" -o output.ext
```

### 5. Delete File

**DELETE** `/api/files/:id`

- Protected: Yes (JWT)

```bash
curl -X DELETE http://localhost:3000/api/files/<FILE_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

## 🧱 Storage Behavior

### Local Storage

- Controlled by `STORAGE_PROVIDER=local`
- Files stored in `LOCAL_UPLOAD_DIR` (default `uploads/`)
- Static files served at `/uploads`
- Stored URL looks like: `/uploads/<filename>`

### S3 Storage

- Controlled by `STORAGE_PROVIDER=s3`
- Uses `aws-sdk` S3 client
- Uploads objects under `uploads/<uuid>.<ext>`
- URL format: `https://<bucket>.s3.<region>.amazonaws.com/uploads/<uuid>.<ext>`

## 🧪 Validation & Limits

- Max file size: **10MB** per file
- Allowed MIME types:
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `application/pdf`

If an unsupported mimetype is uploaded, the API will respond with an error.

## 🧠 What Day 15 Teaches

- How to handle multipart/form-data with Multer
- How to switch between local and cloud storage via config
- How to model file metadata in MongoDB
- How to protect file operations with JWT
- How to serve and download files from both local disk and S3
- How to organize a small Node.js + TypeScript API with clear layers (config, models, services, controllers, middleware)

## ✅ Next Steps

- Integrate with Day 14 auth API to generate real JWTs
- Add file type/size configuration via environment variables
- Implement presigned URL downloads for S3
- Add pagination and search to file listing
