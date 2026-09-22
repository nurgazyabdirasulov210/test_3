import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/app_exception.dart';
import '../../../data/repository/category_repository.dart';
import 'categories_state.dart';

class CategoriesCubit extends Cubit<CategoriesState> {
  CategoriesCubit({required CategoryRepository categoryRepository})
      : _categoryRepository = categoryRepository,
        super(const CategoriesInitial());

  final CategoryRepository _categoryRepository;

  Future<void> load() async {
    emit(const CategoriesLoading());
    try {
      await _categoryRepository.ensureSeeded();
      final categories = await _categoryRepository.getCategories();
      emit(CategoriesLoaded(categories));
    } on AppException catch (e) {
      emit(CategoriesError(e.message));
    } catch (_) {
      emit(const CategoriesError('Не удалось загрузить категории'));
    }
  }

  /// Throws on failure (e.g. category still referenced by a transaction) so
  /// the caller can show it as a SnackBar without discarding the loaded grid.
  Future<void> deleteCategory(int id) async {
    await _categoryRepository.deleteCategory(id);
    await load();
  }
}
