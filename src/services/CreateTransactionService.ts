import { getRepository, getCustomRepository } from 'typeorm';
import Transaction, { TransactionType } from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: TransactionType;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('Insufficient balance');
    }

    const categoriesRepository = getRepository(Category);
    const foundCategory = await categoriesRepository.findOne({
      where: { title: category },
    });
    let categoryId: string;

    if (foundCategory) {
      categoryId = foundCategory.id;
    } else {
      const newCategory = categoriesRepository.create({ title: category });
      await categoriesRepository.save(newCategory);
      categoryId = newCategory.id;
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryId,
    });
    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
