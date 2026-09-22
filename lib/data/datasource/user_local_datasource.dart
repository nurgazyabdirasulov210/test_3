import '../../core/utils/app_exception.dart';
import '../database/app_database.dart';

class UserLocalDataSource {
  UserLocalDataSource(this._db);

  final AppDatabase _db;

  Future<List<UserRow>> getUsers() async {
    try {
      return await _db.selectAllUsers();
    } catch (_) {
      throw const AppException('Не удалось загрузить пользователя');
    }
  }

  Future<int> insertUser({required String name, required String email}) async {
    try {
      return await _db.insertUser(UsersCompanion.insert(name: name, email: email));
    } catch (_) {
      throw const AppException('Не удалось создать пользователя');
    }
  }
}
