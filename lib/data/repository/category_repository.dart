import '../../domain/models/category.dart';

abstract class CategoryRepository {
  Future<List<Category>> getCategories();
  Future<void> ensureSeeded();
  Future<void> addCategory({required String name, required String emoji});
  Future<void> updateCategory(Category category);
  Future<void> deleteCategory(int id);
}
