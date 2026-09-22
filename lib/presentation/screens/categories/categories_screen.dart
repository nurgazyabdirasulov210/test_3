import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../app/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/app_exception.dart';
import '../../../data/repository/category_repository.dart';
import '../../../domain/models/category.dart';
import '../../cubit/categories/categories_cubit.dart';
import '../../cubit/categories/categories_state.dart';
import '../../widgets/app_bottom_nav.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/error_view.dart';

@RoutePage()
class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) =>
          CategoriesCubit(categoryRepository: context.read<CategoryRepository>())..load(),
      child: const _CategoriesView(),
    );
  }
}

class _CategoriesView extends StatelessWidget {
  const _CategoriesView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Категории'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final changed = await context.router.push<bool>(CategoryFormRoute());
              if (changed == true && context.mounted) context.read<CategoriesCubit>().load();
            },
          ),
        ],
      ),
      body: BlocBuilder<CategoriesCubit, CategoriesState>(
        builder: (context, state) {
          return switch (state) {
            CategoriesInitial() ||
            CategoriesLoading() =>
              const Center(child: CircularProgressIndicator()),
            CategoriesError(:final message) =>
              ErrorView(message: message, onRetry: () => context.read<CategoriesCubit>().load()),
            CategoriesLoaded(:final categories) => _CategoriesList(categories: categories),
          };
        },
      ),
      bottomNavigationBar: const AppBottomNav(current: AppTab.categories),
    );
  }
}

class _CategoriesList extends StatelessWidget {
  const _CategoriesList({required this.categories});

  final List<Category> categories;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 900 ? 3 : (constraints.maxWidth > 600 ? 2 : 1);
        final isWide = MediaQuery.of(context).size.width > 600;
        final padding = isWide ? 32.0 : 16.0;

        if (categories.isEmpty) {
          return ListView(
            padding: EdgeInsets.all(padding),
            children: const [_EmptyCategories()],
          );
        }

        if (crossAxisCount == 1) {
          return ListView.builder(
            padding: EdgeInsets.all(padding),
            itemCount: categories.length,
            itemBuilder: (context, index) => _CategoryRow(category: categories[index]),
          );
        }

        return GridView.builder(
          padding: EdgeInsets.all(padding),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisExtent: 76,
            crossAxisSpacing: 12,
            mainAxisSpacing: 8,
          ),
          itemCount: categories.length,
          itemBuilder: (context, index) => _CategoryRow(category: categories[index]),
        );
      },
    );
  }
}

class _EmptyCategories extends StatelessWidget {
  const _EmptyCategories();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 28),
        child: Center(
          child: Column(
            children: const [
              Text('📦', style: TextStyle(fontSize: 30)),
              SizedBox(height: 10),
              Text('Категорий пока нет', style: TextStyle(color: AppColors.ink2, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryRow extends StatelessWidget {
  const _CategoryRow({required this.category});

  final Category category;

  Future<void> _delete(BuildContext context) async {
    try {
      await context.read<CategoriesCubit>().deleteCategory(category.id);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Категория удалена')));
    } on AppException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          action: SnackBarAction(label: 'Повторить', onPressed: () => _delete(context)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: AppColors.ink.withValues(alpha: 0.05), blurRadius: 16, offset: const Offset(0, 4)),
          ],
        ),
        child: Material(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.brandSoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(category.emoji, style: const TextStyle(fontSize: 19)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    category.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                ),
                IconButton(
                  tooltip: 'Изменить',
                  icon: const Icon(Icons.edit_outlined, size: 20),
                  onPressed: () async {
                    final changed =
                        await context.router.push<bool>(CategoryFormRoute(categoryId: category.id));
                    if (changed == true && context.mounted) context.read<CategoriesCubit>().load();
                  },
                ),
                IconButton(
                  tooltip: 'Удалить',
                  icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.danger),
                  onPressed: () async {
                    final confirmed = await showConfirmDialog(
                      context,
                      title: 'Удалить категорию?',
                      subtitle: '${category.emoji} ${category.name}',
                    );
                    if (confirmed && context.mounted) _delete(context);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
