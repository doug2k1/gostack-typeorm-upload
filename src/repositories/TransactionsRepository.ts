import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const balance = transactions.reduce<Balance>(
      (prevBalance, transaction) => {
        const newBalance = { ...prevBalance };

        if (transaction.type === 'income') {
          newBalance.income += transaction.value;
        } else if (transaction.type === 'outcome') {
          newBalance.outcome += transaction.value;
        }

        return newBalance;
      },
      { income: 0, outcome: 0, total: 0 },
    );

    balance.total = balance.income - balance.outcome;

    return balance;
  }
}

export default TransactionsRepository;
