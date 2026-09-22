import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../app/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/app_exception.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/datasource/preferences_datasource.dart';
import '../../../data/repository/transaction_repository.dart';
import '../../../domain/models/transaction.dart';
import '../../cubit/transactions/transactions_cubit.dart';
import '../../cubit/transactions/transactions_state.dart';
import '../../widgets/app_bottom_nav.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/error_view.dart';
import '../../widgets/transaction_tile.dart';

@RoutePage()
class TransactionsScreen extends StatelessWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => TransactionsCubit(
        transactionRepository: context.read<TransactionRepository>(),
        preferencesDataSource: context.read<PreferencesDataSource>(),
      )..load(),
      child: const _TransactionsView(),
    );
  }
}

class _TransactionsView extends StatelessWidget {
  const _TransactionsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Все операции')),
      body: BlocBuilder<TransactionsCubit, TransactionsState>(
        builder: (context, state) {
          return switch (state) {
            TransactionsInitial() ||
            TransactionsLoading() =>
              const Center(child: CircularProgressIndicator()),
            TransactionsError(:final message) =>
              ErrorView(message: message, onRetry: () => context.read<TransactionsCubit>().load()),
            TransactionsLoaded(:final transactions, :final currency) =>
              _TransactionsList(transactions: transactions, currency: currency),
          };
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final added = await context.router.push<bool>(TransactionFormRoute());
          if (added == true && context.mounted) context.read<TransactionsCubit>().load();
        },
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: const AppBottomNav(current: AppTab.transactions),
    );
  }
}

class _TransactionsList extends StatelessWidget {
  const _TransactionsList({required this.transactions, required this.currency});

  final List<Transaction> transactions;
  final String currency;

  Future<void> _delete(BuildContext context, Transaction t) async {
    try {
      await context.read<TransactionsCubit>().deleteTransaction(t.id);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Расход удалён')));
    } on AppException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          action: SnackBarAction(label: 'Повторить', onPressed: () => _delete(context, t)),
        ),
      );
    }
  }

  Future<void> _openDetails(BuildContext context, Transaction t) async {
    final changed = await context.router.push<bool>(TransactionDetailsRoute(transaction: t));
    if (changed == true && context.mounted) context.read<TransactionsCubit>().load();
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 600;
    final padding = isWide ? 32.0 : 16.0;

    if (transactions.isEmpty) {
      return ListView(
        padding: EdgeInsets.all(padding),
        children: const [
          _EmptyTransactions(),
        ],
      );
    }
    final formatters = AppFormatters(currency);

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth > 600;

        Widget tileFor(Transaction t) => Dismissible(
              key: ValueKey(t.id),
              direction: DismissDirection.endToStart,
              background: Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    color: AppColors.danger,
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: const Icon(Icons.delete_outline, color: Colors.white),
                  ),
                ),
              ),
              confirmDismiss: (_) => showConfirmDialog(
                context,
                title: 'Удалить операцию?',
                subtitle: '${t.title}\n${formatters.amount(t.amount)}',
              ),
              onDismissed: (_) => _delete(context, t),
              child: TransactionTile(
                transaction: t,
                formatters: formatters,
                onTap: () => _openDetails(context, t),
              ),
            );

        if (!wide) {
          return ListView.builder(
            padding: EdgeInsets.all(padding),
            itemCount: transactions.length,
            itemBuilder: (context, index) => tileFor(transactions[index]),
          );
        }

        return GridView.builder(
          padding: EdgeInsets.all(padding),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisExtent: 88,
            crossAxisSpacing: 12,
            mainAxisSpacing: 0,
          ),
          itemCount: transactions.length,
          itemBuilder: (context, index) => tileFor(transactions[index]),
        );
      },
    );
  }
}

class _EmptyTransactions extends StatelessWidget {
  const _EmptyTransactions();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 28),
        child: Center(
          child: Column(
            children: const [
              Text('🧾', style: TextStyle(fontSize: 30)),
              SizedBox(height: 10),
              Text('Операций пока нет', style: TextStyle(color: AppColors.ink2, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }
}
