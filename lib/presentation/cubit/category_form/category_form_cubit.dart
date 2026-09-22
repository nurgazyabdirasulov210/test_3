import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/app_exception.dart';
import '../../../data/repository/category_repository.dart';
import 'category_form_state.dart';

class CategoryFormCubit extends Cubit<CategoryFormState> {
  CategoryFormCubit({required CategoryRepository categoryRepository, this.categoryId})
      : _categoryRepository = categoryRepository,
        super(const CategoryFormLoading()) {
    _load();
  }

  final CategoryRepository _categoryRepository;

  /// Null means "add" mode; a value looks the category up for editing.
  final int? categoryId;

  Future<void> _load() async {
    if (categoryId == null) {
      emit(const CategoryFormReady());
      return;
    }
    try {
      final categories = await _categoryRepository.getCategories();
      final existing = categories.where((c) => c.id == categoryId).firstOrNull;
      emit(CategoryFormReady(existing: existing));
    } on AppException catch (e) {
      emit(CategoryFormError(e.message));
    } catch (_) {
      emit(const CategoryFormError('Не удалось загрузить категорию'));
    }
  }

  Future<void> submit({required String name, required String emoji}) async {
    final current = state;
    if (current is! CategoryFormReady) return;
    emit(current.copyWith(isSubmitting: true));
    try {
      if (current.existing == null) {
        await _categoryRepository.addCategory(name: name, emoji: emoji);
      } else {
        await _categoryRepository.updateCategory(current.existing!.copyWith(name: name, emoji: emoji));
      }
      emit(const CategoryFormSuccess());
    } on AppException catch (e) {
      emit(CategoryFormError(e.message));
      emit(current.copyWith(isSubmitting: false));
    } catch (_) {
      emit(const CategoryFormError('Не удалось сохранить категорию'));
      emit(current.copyWith(isSubmitting: false));
    }
  }
}
