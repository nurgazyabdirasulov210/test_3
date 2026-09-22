import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/app_exception.dart';
import '../../../data/datasource/preferences_datasource.dart';
import '../../../data/repository/category_repository.dart';
import '../../../data/repository/transaction_repository.dart';
import 'home_state.dart';

class HomeCubit extends Cubit<HomeState> {
  HomeCubit({
    required TransactionRepository transactionRepository,
    required CategoryRepository categoryRepository,
    required PreferencesDataSource preferencesDataSource,
  })  : _transactionRepository = transactionRepository,
        _categoryRepository = categoryRepository,
        _preferencesDataSource = preferencesDataSource,
        super(const HomeInitial());

  final TransactionRepository _transactionRepository;
  final CategoryRepository _categoryRepository;
  final PreferencesDataSource _preferencesDataSource;

  Future<void> load() async {
    emit(const HomeLoading());
    try {
      await _categoryRepository.ensureSeeded();
      final transactions = await _transactionRepository.getTransactions();
      final now = DateTime.now();

      double todayTotal = 0;
      double monthTotal = 0;
      for (final t in transactions) {
        final createdAt = t.createdAt;
        final isSameDay = createdAt.year == now.year &&
            createdAt.month == now.month &&
            createdAt.day == now.day;
        final isSameMonth = createdAt.year == now.year && createdAt.month == now.month;
        if (isSameDay) todayTotal += t.amount;
        if (isSameMonth) monthTotal += t.amount;
      }

      emit(HomeLoaded(
        userName: _preferencesDataSource.userName,
        currency: _preferencesDataSource.currency,
        todayTotal: todayTotal,
        monthTotal: monthTotal,
        recentTransactions: transactions.take(5).toList(),
      ));
    } on AppException catch (e) {
      emit(HomeError(e.message));
    } catch (_) {
      emit(const HomeError('Не удалось загрузить данные'));
    }
  }

  /// Re-reads currency/name from SharedPreferences without a full reload,
  /// used from didChangeDependencies() after returning from Settings.
  void refreshPreferences() {
    final current = state;
    if (current is HomeLoaded) {
      emit(HomeLoaded(
        userName: _preferencesDataSource.userName,
        currency: _preferencesDataSource.currency,
        todayTotal: current.todayTotal,
        monthTotal: current.monthTotal,
        recentTransactions: current.recentTransactions,
      ));
    }
  }
}
