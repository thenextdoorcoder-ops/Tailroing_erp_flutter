import express from 'express';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} from './expense.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getExpenses);
router.get('/summary', getExpenseSummary);
router.get('/:id', getExpenseById);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
