import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/app_exception.dart';
import '../../../data/datasource/preferences_datasource.dart';
import '../../../data/repository/transaction_repository.dart';
import 'transactions_state.dart';

class TransactionsCubit extends Cubit<TransactionsState> {
  TransactionsCubit({
    required TransactionRepository transactionRepository,
    required PreferencesDataSource preferencesDataSource,
  })  : _transactionRepository = transactionRepository,
        _preferencesDataSource = preferencesDataSource,
        super(const TransactionsInitial());

  final TransactionRepository _transactionRepository;
  final PreferencesDataSource _preferencesDataSource;

  Future<void> load() async {
    emit(const TransactionsLoading());
    try {
      final transactions = await _transactionRepository.getTransactions();
      emit(TransactionsLoaded(transactions, _preferencesDataSource.currency));
    } on AppException catch (e) {
      emit(TransactionsError(e.message));
    } catch (_) {
      emit(const TransactionsError('Не удалось загрузить операции'));
    }
  }

  /// Throws on failure (rather than emitting an Error state) so a single
  /// delete failure doesn't blank out the already-loaded list; the caller
  /// shows the error as a SnackBar with a retry action instead.
  Future<void> deleteTransaction(int id) async {
    await _transactionRepository.deleteTransaction(id);
    await load();
  }
}
