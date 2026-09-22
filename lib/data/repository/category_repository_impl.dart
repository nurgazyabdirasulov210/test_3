import '../../core/constants/category_presets.dart';
import '../../domain/models/category.dart';
import '../database/app_database.dart';
import '../datasource/category_local_datasource.dart';
import 'category_repository.dart';

class CategoryRepositoryImpl implements CategoryRepository {
  CategoryRepositoryImpl(this._localDataSource);

  final CategoryLocalDataSource _localDataSource;

  Category _toDomain(CategoryRow row) => Category(id: row.id, name: row.name, emoji: row.emoji);

  @override
  Future<void> ensureSeeded() async {
    final existing = await _localDataSource.getCategories();
    if (existing.isNotEmpty) return;
    for (final preset in defaultCategoryPresets) {
      await _localDataSource.insertCategory(name: preset.name, emoji: preset.emoji);
    }
  }

  @override
  Future<List<Category>> getCategories() async {
    final rows = await _localDataSource.getCategories();
    return rows.map(_toDomain).toList();
  }

  @override
  Future<void> addCategory({required String name, required String emoji}) {
    return _localDataSource.insertCategory(name: name, emoji: emoji);
  }

  @override
  Future<void> updateCategory(Category category) {
    return _localDataSource.updateCategory(
      CategoryRow(id: category.id, name: category.name, emoji: category.emoji),
    );
  }

  @override
  Future<void> deleteCategory(int id) {
    return _localDataSource.deleteCategory(id);
  }
}
