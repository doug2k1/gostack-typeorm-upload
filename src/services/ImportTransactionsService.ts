import fs from 'fs';
import path from 'path';
import parse from 'csv-parse/lib/sync';
import { getCustomRepository, getRepository } from 'typeorm';
import Transaction, { TransactionType } from '../models/Transaction';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import CreateTransactionService from './CreateTransactionService';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  filename: string;
}

interface TransactionDTO {
  title: string;
  type: TransactionType;
  value: number;
  category: string;
  category_id: string;
}

class ImportTransactionsService {
  private async createCategories(
    transactions: TransactionDTO[],
  ): Promise<Partial<Transaction>[]> {
    // remove duplicates
    const categoriesNames = Array.from(
      new Set(transactions.map(t => t.category)),
    );
    const categoriesRepository = getRepository(Category);
    const categoriesFound = await categoriesRepository.find({
      where: { title: categoriesNames },
    });
    const categoriesNamesFound = categoriesFound.map(c => c.title);
    const categoriesNamesToAdd = categoriesNames.filter(
      c => !categoriesNamesFound.includes(c),
    );

    const createdCategories = categoriesRepository.create(
      categoriesNamesToAdd.map(c => ({
        title: c,
      })),
    );
    await categoriesRepository.save(createdCategories);

    const allCategories = [...categoriesFound, ...createdCategories];
    const updatedTransactions = transactions.map(t => {
      const cat = allCategories.find(c => c.title === t.category);

      const newT = {
        ...t,
        category_id: cat ? cat.id : '',
      };

      delete newT.category;

      return newT as Omit<TransactionDTO, 'category'>;
    });

    return updatedTransactions;
  }

  async execute({ filename }: Request): Promise<Transaction[]> {
    const filePath = path.join(uploadConfig.storagePath, filename);
    const fileExists = await fs.promises.stat(filePath);

    if (!fileExists) {
      throw new AppError('Could not import CSV', 500);
    }

    const fileContents = await fs.promises.readFile(filePath, 'utf-8');
    const parsedCSV: string[][] = parse(fileContents, { from_line: 2 });

    const transactionsData: TransactionDTO[] = parsedCSV.map(line => ({
      title: line[0].trim(),
      type: line[1].trim() as TransactionType,
      value: parseFloat(line[2]),
      category: line[3].trim(),
      category_id: '',
    }));

    await fs.promises.unlink(filePath);

    const transactionsWithCategories = await this.createCategories(
      transactionsData,
    );

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transactions = transactionsRepository.create(
      transactionsWithCategories,
    );
    await transactionsRepository.save(transactions);

    return transactions;
  }
}

export default ImportTransactionsService;
