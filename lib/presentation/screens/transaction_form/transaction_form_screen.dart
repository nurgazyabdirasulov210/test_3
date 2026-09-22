import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../data/repository/category_repository.dart';
import '../../../data/repository/transaction_repository.dart';
import '../../../domain/models/category.dart';
import '../../../domain/models/transaction.dart';
import '../../../domain/models/user.dart';
import '../../cubit/transaction_form/transaction_form_cubit.dart';
import '../../cubit/transaction_form/transaction_form_state.dart';
import '../../widgets/add_success_overlay.dart';
import '../../widgets/field_label.dart';

@RoutePage()
class TransactionFormScreen extends StatefulWidget {
  const TransactionFormScreen({super.key, this.transaction});

  /// Null means "add" mode; non-null means "edit" mode.
  final Transaction? transaction;

  @override
  State<TransactionFormScreen> createState() => _TransactionFormScreenState();
}

class _TransactionFormScreenState extends State<TransactionFormScreen> {
  late final TextEditingController _titleController;
  late final TextEditingController _amountController;
  late final TextEditingController _descriptionController;
  late final TransactionFormCubit _cubit;

  int? _selectedCategoryId;
  final _formKey = GlobalKey<FormState>();

  bool get _isEditing => widget.transaction != null;

  @override
  void initState() {
    super.initState();
    // Prefill controllers from the edited transaction, or start blank when adding.
    final t = widget.transaction;
    _titleController = TextEditingController(text: t?.title ?? '');
    _amountController = TextEditingController(text: t == null ? '' : _formatAmountInput(t.amount));
    _descriptionController = TextEditingController(text: t?.description ?? '');
    _selectedCategoryId = t?.categoryId;

    _cubit = TransactionFormCubit(
      transactionRepository: context.read<TransactionRepository>(),
      categoryRepository: context.read<CategoryRepository>(),
      userId: t?.userId ?? context.read<User>().id,
      editingTransaction: t,
    );
  }

  String _formatAmountInput(double value) {
    return value == value.roundToDouble() ? value.toStringAsFixed(0) : value.toString();
  }

  @override
  void deactivate() {
    // Leaving this screen (save, back button, or system navigation) — don't
    // let a stale validation/error snackbar linger into the screen behind it.
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    super.deactivate();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    _cubit.close();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategoryId == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Выберите категорию')));
      return;
    }
    final amount = double.parse(_amountController.text.replaceAll(',', '.'));
    final description = _descriptionController.text.trim();
    _cubit.submit(
      title: _titleController.text.trim(),
      amount: amount,
      categoryId: _selectedCategoryId!,
      description: description.isEmpty ? null : description,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: Scaffold(
        appBar: AppBar(title: Text(_isEditing ? 'Редактировать операцию' : 'Новая операция')),
        body: BlocConsumer<TransactionFormCubit, TransactionFormState>(
          listener: (context, state) async {
            if (state is TransactionFormAddSuccess) {
              await showAddSuccessOverlay(context);
              if (!context.mounted) return;
              // Capture the messenger before popping: once the route is
              // popped, this widget's context is deactivated and can no
              // longer be used to look up an ancestor (that was the cause
              // of the red error screen after saving).
              final messenger = ScaffoldMessenger.of(context);
              Navigator.of(context).pop(true);
              messenger.showSnackBar(const SnackBar(content: Text('Расход успешно добавлен')));
            } else if (state is TransactionFormUpdateSuccess) {
              final messenger = ScaffoldMessenger.of(context);
              Navigator.of(context).pop(true);
              messenger.showSnackBar(const SnackBar(content: Text('Операция обновлена')));
            } else if (state is TransactionFormError) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message)));
            }
          },
          builder: (context, state) {
            if (state is TransactionFormLoading) {
              return const Center(child: CircularProgressIndicator());
            }
            final isSubmitting = state is TransactionFormReady && state.isSubmitting;
            return _FormBody(
              formKey: _formKey,
              titleController: _titleController,
              amountController: _amountController,
              descriptionController: _descriptionController,
              categories: _cubit.categories,
              selectedCategoryId: _selectedCategoryId,
              onCategoryChanged: (id) => setState(() => _selectedCategoryId = id),
              isSubmitting: isSubmitting,
              onSave: _submit,
            );
          },
        ),
      ),
    );
  }
}

class _FormBody extends StatelessWidget {
  const _FormBody({
    required this.formKey,
    required this.titleController,
    required this.amountController,
    required this.descriptionController,
    required this.categories,
    required this.selectedCategoryId,
    required this.onCategoryChanged,
    required this.isSubmitting,
    required this.onSave,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController titleController;
  final TextEditingController amountController;
  final TextEditingController descriptionController;
  final List<Category> categories;
  final int? selectedCategoryId;
  final ValueChanged<int?> onCategoryChanged;
  final bool isSubmitting;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 600;
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          padding: EdgeInsets.all(isWide ? 32 : 16),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: isWide ? 480 : double.infinity),
            child: Form(
              key: formKey,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const FieldLabel('Название'),
                      TextFormField(
                        controller: titleController,
                        decoration: const InputDecoration(hintText: 'Burger'),
                        validator: (value) =>
                            (value == null || value.trim().isEmpty) ? 'Введите название' : null,
                      ),
                      const SizedBox(height: 16),
                      const FieldLabel('Сумма'),
                      TextFormField(
                        controller: amountController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(hintText: '450'),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) return 'Введите сумму';
                          final parsed = double.tryParse(value.replaceAll(',', '.'));
                          if (parsed == null || parsed <= 0) return 'Некорректная сумма';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      const FieldLabel('Категория'),
                      DropdownButtonFormField<int>(
                        initialValue: categories.any((c) => c.id == selectedCategoryId)
                            ? selectedCategoryId
                            : null,
                        items: categories
                            .map((c) => DropdownMenuItem(
                                  value: c.id,
                                  child: Text('${c.emoji} ${c.name}'),
                                ))
                            .toList(),
                        onChanged: onCategoryChanged,
                        decoration: const InputDecoration(hintText: 'Выберите категорию'),
                      ),
                      const SizedBox(height: 16),
                      const FieldLabel('Описание'),
                      TextFormField(
                        controller: descriptionController,
                        minLines: 2,
                        maxLines: 4,
                        decoration: const InputDecoration(hintText: 'Обед с друзьями'),
                      ),
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: isSubmitting ? null : onSave,
                        child: isSubmitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Сохранить'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
