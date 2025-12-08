import { Router } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/authMiddleware";

const router = Router();

router.get("/profile", authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({
    message: "This is a protected profile route",
    user: req.user,
  });
});

export default router;
