import '../../core/utils/app_exception.dart';
import '../database/app_database.dart';

class CategoryLocalDataSource {
  CategoryLocalDataSource(this._db);

  final AppDatabase _db;

  Future<List<CategoryRow>> getCategories() async {
    try {
      return await _db.selectAllCategories();
    } catch (_) {
      throw const AppException('Не удалось загрузить категории');
    }
  }

  Future<int> insertCategory({required String name, required String emoji}) async {
    try {
      return await _db.insertCategory(CategoriesCompanion.insert(name: name, emoji: emoji));
    } catch (_) {
      throw const AppException('Не удалось создать категорию');
    }
  }

  Future<void> updateCategory(CategoryRow category) async {
    try {
      await _db.updateCategory(category);
    } catch (_) {
      throw const AppException('Не удалось изменить категорию');
    }
  }

  Future<void> deleteCategory(int id) async {
    try {
      await _db.deleteCategory(id);
    } catch (_) {
      throw const AppException('Не удалось удалить категорию');
    }
  }
}
