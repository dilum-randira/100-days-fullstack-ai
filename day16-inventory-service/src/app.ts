import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import inventoryRouter from './routes/inventory';
import { errorHandler } from './middlewares/errorHandler';

const app: Application = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Day 16 - Inventory Service',
  });
});

app.use('/api/inventory', inventoryRouter);

app.use(errorHandler);

export default app;
