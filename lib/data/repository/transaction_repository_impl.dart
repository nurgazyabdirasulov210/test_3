import 'package:drift/drift.dart';

import '../../domain/models/category.dart';
import '../../domain/models/transaction.dart';
import '../database/app_database.dart';
import '../datasource/transaction_local_datasource.dart';
import 'category_repository.dart';
import 'transaction_repository.dart';

class TransactionRepositoryImpl implements TransactionRepository {
  TransactionRepositoryImpl(this._localDataSource, this._categoryRepository);

  final TransactionLocalDataSource _localDataSource;
  final CategoryRepository _categoryRepository;

  Future<Transaction> _toDomain(TransactionRow row, Map<int, Category> categoriesById) async {
    return Transaction(
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      title: row.title,
      amount: row.amount,
      description: row.description,
      createdAt: row.createdAt,
      category: categoriesById[row.categoryId],
    );
  }

  @override
  Future<List<Transaction>> getTransactions() async {
    final rows = await _localDataSource.getTransactions();
    final categories = await _categoryRepository.getCategories();
    final categoriesById = {for (final c in categories) c.id: c};
    return Future.wait(rows.map((row) => _toDomain(row, categoriesById)));
  }

  @override
  Future<void> addTransaction({
    required int userId,
    required int categoryId,
    required String title,
    required double amount,
    required String? description,
  }) {
    return _localDataSource.insertTransaction(
      TransactionsCompanion.insert(
        userId: userId,
        categoryId: categoryId,
        title: title,
        amount: amount,
        description: Value(description),
        createdAt: DateTime.now(),
      ),
    );
  }

  @override
  Future<void> updateTransaction(Transaction transaction) {
    return _localDataSource.updateTransaction(
      TransactionRow(
        id: transaction.id,
        userId: transaction.userId,
        categoryId: transaction.categoryId,
        title: transaction.title,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
      ),
    );
  }

  @override
  Future<void> deleteTransaction(int id) {
    return _localDataSource.deleteTransaction(id);
  }
}
