import { Router } from 'express';
import { getErrorBudgetState } from './errorBudget';
import { getSLI } from './metrics';

const router = Router();

router.get('/slo', (_req, res) => {
  // Return SLI snapshot for configured services
  res.json({ services: { authService: getSLI() } });
});

router.get('/error-budget', (_req, res) => {
  const state = getErrorBudgetState('authService');
  res.json(state);
});

export default router;
