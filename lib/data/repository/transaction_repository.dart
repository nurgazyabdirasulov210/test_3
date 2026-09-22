import '../../domain/models/transaction.dart';

abstract class TransactionRepository {
  Future<List<Transaction>> getTransactions();

  Future<void> addTransaction({
    required int userId,
    required int categoryId,
    required String title,
    required double amount,
    required String? description,
  });

  Future<void> updateTransaction(Transaction transaction);

  Future<void> deleteTransaction(int id);
}
