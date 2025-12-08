import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import authRoutes from "./routes/auth";
import protectedRoutes from "./routes/protected";

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(bodyParser.json());

app.get("/", (_req, res) => {
  res.json({ message: "Day 12 – Auth API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
  },
);

app.listen(PORT, () => {
  console.log(`Auth API listening on http://localhost:${PORT}`);
});
