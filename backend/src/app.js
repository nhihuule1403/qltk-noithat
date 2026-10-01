import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './lib/errors.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import productsRouter from './routes/products.js';
import customersRouter from './routes/customers.js';
import stockMovementsRouter from './routes/stockMovements.js';
import reportsRouter from './routes/reports.js';
import { categoriesRouter, unitsRouter, suppliersRouter } from './routes/masterData.js';
import { purchaseOrdersRouter, salesInvoicesRouter, inventoryChecksRouter } from './routes/documents.js';

export const app = express();

app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);

app.use('/api', authenticate);
app.use('/api/users', usersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/units', unitsRouter);
app.use('/api/products', productsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/sales-invoices', salesInvoicesRouter);
app.use('/api/inventory-checks', inventoryChecksRouter);
app.use('/api/stock-movements', stockMovementsRouter);
app.use('/api/reports', reportsRouter);

app.use('/api', (_req, res) => res.status(404).json({ message: 'API không tồn tại' }));
app.use(errorHandler);
