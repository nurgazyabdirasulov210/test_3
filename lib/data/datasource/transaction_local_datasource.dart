import '../../core/utils/app_exception.dart';
import '../database/app_database.dart';

class TransactionLocalDataSource {
  TransactionLocalDataSource(this._db);

  final AppDatabase _db;

  Future<List<TransactionRow>> getTransactions() async {
    try {
      return await _db.selectAllTransactions();
    } catch (_) {
      throw const AppException('Не удалось загрузить операции');
    }
  }

  Future<int> insertTransaction(TransactionsCompanion transaction) async {
    try {
      return await _db.insertTransaction(transaction);
    } catch (_) {
      throw const AppException('Не удалось добавить расход');
    }
  }

  Future<void> updateTransaction(TransactionRow transaction) async {
    try {
      await _db.updateTransaction(transaction);
    } catch (_) {
      throw const AppException('Не удалось изменить операцию');
    }
  }

  Future<void> deleteTransaction(int id) async {
    try {
      await _db.deleteTransaction(id);
    } catch (_) {
      throw const AppException('Не удалось удалить расход');
    }
  }
}
