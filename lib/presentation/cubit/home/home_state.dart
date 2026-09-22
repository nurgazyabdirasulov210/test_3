import '../../../domain/models/transaction.dart';

sealed class HomeState {
  const HomeState();
}

class HomeInitial extends HomeState {
  const HomeInitial();
}

class HomeLoading extends HomeState {
  const HomeLoading();
}

class HomeLoaded extends HomeState {
  const HomeLoaded({
    required this.userName,
    required this.currency,
    required this.todayTotal,
    required this.monthTotal,
    required this.recentTransactions,
  });

  final String userName;
  final String currency;
  final double todayTotal;
  final double monthTotal;
  final List<Transaction> recentTransactions;
}

class HomeError extends HomeState {
  const HomeError(this.message);

  final String message;
}
