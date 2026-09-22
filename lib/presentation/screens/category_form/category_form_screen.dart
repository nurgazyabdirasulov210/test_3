import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/constants/category_presets.dart';
import '../../../data/repository/category_repository.dart';
import '../../../domain/models/category.dart';
import '../../cubit/category_form/category_form_cubit.dart';
import '../../cubit/category_form/category_form_state.dart';
import '../../widgets/category_chip_picker.dart';
import '../../widgets/field_label.dart';

@RoutePage()
class CategoryFormScreen extends StatelessWidget {
  const CategoryFormScreen({super.key, this.categoryId});

  /// Null means "add" mode; a value looks the category up for editing.
  final int? categoryId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => CategoryFormCubit(
        categoryRepository: context.read<CategoryRepository>(),
        categoryId: categoryId,
      ),
      child: Scaffold(
        appBar: AppBar(title: Text(categoryId == null ? 'Новая категория' : 'Изменить категорию')),
        body: BlocConsumer<CategoryFormCubit, CategoryFormState>(
          listener: (context, state) {
            if (state is CategoryFormSuccess) {
              Navigator.of(context).pop(true);
            } else if (state is CategoryFormError) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message)));
            }
          },
          builder: (context, state) {
            return switch (state) {
              CategoryFormLoading() => const Center(child: CircularProgressIndicator()),
              CategoryFormError() when categoryId != null =>
                const Center(child: Text('Не удалось загрузить категорию')),
              CategoryFormReady() => _CategoryFormBody(existing: state.existing, isSubmitting: state.isSubmitting),
              _ => const SizedBox.shrink(),
            };
          },
        ),
      ),
    );
  }
}

class _CategoryFormBody extends StatefulWidget {
  const _CategoryFormBody({required this.existing, required this.isSubmitting});

  final Category? existing;
  final bool isSubmitting;

  @override
  State<_CategoryFormBody> createState() => _CategoryFormBodyState();
}

class _CategoryFormBodyState extends State<_CategoryFormBody> {
  late final TextEditingController _nameController;
  late String _selectedEmoji;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.existing?.name ?? '');
    _selectedEmoji = widget.existing?.emoji ?? pickableEmojis.first;
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context
        .read<CategoryFormCubit>()
        .submit(name: _nameController.text.trim(), emoji: _selectedEmoji);
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 600;
    return SingleChildScrollView(
      padding: EdgeInsets.all(isWide ? 32 : 16),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: isWide ? 480 : double.infinity),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const FieldLabel('Название'),
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(hintText: 'Например, Подписки'),
                    validator: (value) =>
                        (value == null || value.trim().isEmpty) ? 'Введите название' : null,
                  ),
                  const SizedBox(height: 16),
                  const FieldLabel('Иконка'),
                  CategoryChipPicker(
                    emojis: pickableEmojis,
                    selected: _selectedEmoji,
                    onSelected: (emoji) => setState(() => _selectedEmoji = emoji),
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: widget.isSubmitting ? null : _submit,
                    child: widget.isSubmitting
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
  }
}
