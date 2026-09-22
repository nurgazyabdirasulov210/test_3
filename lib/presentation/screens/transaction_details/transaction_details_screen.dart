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
import '../../widgets/confirm_dialog.dart';

@RoutePage()
class TransactionDetailsScreen extends StatefulWidget {
  const TransactionDetailsScreen({super.key, required this.transaction});

  final Transaction transaction;

  @override
  State<TransactionDetailsScreen> createState() => _TransactionDetailsScreenState();
}

class _TransactionDetailsScreenState extends State<TransactionDetailsScreen> {
  bool _isDeleting = false;

  Future<void> _delete() async {
    final formatters = AppFormatters(context.read<PreferencesDataSource>().currency);
    final transactionRepository = context.read<TransactionRepository>();
    final confirmed = await showConfirmDialog(
      context,
      title: 'Удалить операцию?',
      subtitle: '${widget.transaction.title}\n${formatters.amount(widget.transaction.amount)}',
    );
    if (!confirmed) return;

    setState(() => _isDeleting = true);
    try {
      await transactionRepository.deleteTransaction(widget.transaction.id);
      if (!mounted) return;
      context.router.maybePop(true);
    } on AppException catch (e) {
      if (!mounted) return;
      setState(() => _isDeleting = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _edit() async {
    final updated = await context.router.push<bool>(
      TransactionFormRoute(transaction: widget.transaction),
    );
    if (updated == true && mounted) context.router.maybePop(true);
  }

  @override
  Widget build(BuildContext context) {
    final transaction = widget.transaction;
    final currency = context.read<PreferencesDataSource>().currency;
    final formatters = AppFormatters(currency);

    return Scaffold(
      appBar: AppBar(title: const Text('Операция')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            children: [
                              Text(transaction.category?.emoji ?? '📦',
                                  style: const TextStyle(fontSize: 38)),
                              const SizedBox(height: 6),
                              Text(
                                '− ${formatters.amount(transaction.amount)}',
                                style: const TextStyle(
                                    fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                transaction.title,
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Column(
                            children: [
                              _KvRow('Категория', transaction.category?.name ?? 'Другое'),
                              _KvRow('Дата', formatters.date(transaction.createdAt)),
                              _KvRow('Описание',
                                  (transaction.description ?? '').isEmpty
                                      ? '—'
                                      : transaction.description!,
                                  isLast: true),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isDeleting ? null : _edit,
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('Редактировать'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _isDeleting ? null : _delete,
                      style: FilledButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.error,
                      ),
                      icon: _isDeleting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.delete_outline),
                      label: const Text('Удалить'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KvRow extends StatelessWidget {
  const _KvRow(this.label, this.value, {this.isLast = false});

  final String label;
  final String value;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: isLast
          ? null
          : const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.line))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: AppColors.ink2)),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
