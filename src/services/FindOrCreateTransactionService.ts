import { getRepository } from 'typeorm';
import Category from '../models/Category';

interface Request {
  title: string;
}

class FindOrCreateTransactionService {
  public async execute({ title }: Request): Promise<Category> {
    const categoriesRepository = getRepository(Category);

    let category = await categoriesRepository.findOne({
      where: { title },
    });

    if (!category) {
      category = categoriesRepository.create({ title });
      await categoriesRepository.save(category);
    }

    return category;
  }
}

export default FindOrCreateTransactionService;
