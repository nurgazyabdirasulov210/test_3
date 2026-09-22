/// Thrown by the data layer (Drift/SharedPreferences access) and translated
/// into an ErrorState by the corresponding Cubit.
class AppException implements Exception {
  const AppException(this.message);

  final String message;

  @override
  String toString() => message;
}
