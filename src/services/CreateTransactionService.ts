import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import FindOrCreateTransactionService from './FindOrCreateTransactionService';
import TransactionRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  categoryTitle: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    categoryTitle,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);

    if (type === 'outcome') {
      const balance = await transactionRepository.getBalance();
      if (balance.total < value) throw new AppError('Insufficient balance');
    }

    const findOrCreate = new FindOrCreateTransactionService();
    const category = await findOrCreate.execute({ title: categoryTitle });

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      categoryId: category.id,
      category,
    });

    await transactionRepository.save(transaction);

    delete transaction.createdAt;
    delete transaction.updatedAt;
    delete transaction.category.createdAt;
    delete transaction.category.updatedAt;

    return transaction;
  }
}

export default CreateTransactionService;
