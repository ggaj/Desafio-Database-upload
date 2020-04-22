import { createReadStream, promises } from 'fs';
import csvParse from 'csv-parse';
import { getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import FindOrCreateTransactionService from './FindOrCreateTransactionService';

interface Request {
  filePath: string;
}

interface CSVParser {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  categoryTitle: string;
}

class ImportTransactionsService {
  public async execute({ filePath }: Request): Promise<Transaction[]> {
    const fileCreatedStream = createReadStream(filePath);

    const csvParsed = fileCreatedStream.pipe(csvParse({ from_line: 2 }));

    const transactionsTmp: CSVParser[] = [];
    const categoriesArr: string[] = [];

    csvParsed.on('data', line => {
      const [title, type, value, categoryTitle] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!categoriesArr.includes(categoryTitle)) {
        categoriesArr.push(categoryTitle);
      }
      transactionsTmp.push({ title, type, value, categoryTitle });
    });

    const findOrCreate = new FindOrCreateTransactionService();

    await new Promise(resolve => csvParsed.on('end', resolve));

    const categories = await Promise.all(
      categoriesArr.map(async categoryTitle => {
        const category = await findOrCreate.execute({ title: categoryTitle });
        return category;
      }),
    );

    const transactionRepository = getRepository(Transaction);

    const transactions = transactionsTmp.map(
      ({ title, type, value, categoryTitle }) => {
        const transaction = transactionRepository.create({
          title,
          type,
          value,
          category: categories.find(
            category => categoryTitle === category.title,
          ),
        });

        delete transaction.category.createdAt;
        delete transaction.category.updatedAt;

        return transaction;
      },
    );

    await transactionRepository.save(transactions);

    await promises.unlink(filePath);

    return transactions;
  }
}

export default ImportTransactionsService;
