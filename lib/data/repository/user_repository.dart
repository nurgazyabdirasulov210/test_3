import '../../domain/models/user.dart';

abstract class UserRepository {
  /// Returns the current user, seeding one if none exists yet.
  Future<User> getCurrentUser();
}
