import '../../domain/models/user.dart';
import '../datasource/preferences_datasource.dart';
import '../datasource/user_local_datasource.dart';
import 'user_repository.dart';

class UserRepositoryImpl implements UserRepository {
  UserRepositoryImpl(this._localDataSource, this._preferencesDataSource);

  final UserLocalDataSource _localDataSource;
  final PreferencesDataSource _preferencesDataSource;

  @override
  Future<User> getCurrentUser() async {
    final users = await _localDataSource.getUsers();
    if (users.isEmpty) {
      final id = await _localDataSource.insertUser(
        name: _preferencesDataSource.userName,
        email: 'user@moneytracker.local',
      );
      return User(id: id, name: _preferencesDataSource.userName, email: 'user@moneytracker.local');
    }
    final row = users.first;
    return User(id: row.id, name: row.name, email: row.email);
  }
}
