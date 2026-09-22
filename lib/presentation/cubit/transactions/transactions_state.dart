import '../../../domain/models/transaction.dart';

sealed class TransactionsState {
  const TransactionsState();
}

class TransactionsInitial extends TransactionsState {
  const TransactionsInitial();
}

class TransactionsLoading extends TransactionsState {
  const TransactionsLoading();
}

class TransactionsLoaded extends TransactionsState {
  const TransactionsLoaded(this.transactions, this.currency);

  final List<Transaction> transactions;
  final String currency;
}

class TransactionsError extends TransactionsState {
  const TransactionsError(this.message);

  final String message;
}
