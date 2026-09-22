import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'app/app_router.dart';
import 'data/database/app_database.dart';
import 'data/datasource/category_local_datasource.dart';
import 'data/datasource/preferences_datasource.dart';
import 'data/datasource/transaction_local_datasource.dart';
import 'data/datasource/user_local_datasource.dart';
import 'data/repository/category_repository_impl.dart';
import 'data/repository/transaction_repository_impl.dart';
import 'data/repository/user_repository_impl.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final sharedPreferences = await SharedPreferences.getInstance();
  final database = AppDatabase();

  final preferencesDataSource = PreferencesDataSource(sharedPreferences);
  final categoryRepository = CategoryRepositoryImpl(CategoryLocalDataSource(database));
  final transactionRepository = TransactionRepositoryImpl(
    TransactionLocalDataSource(database),
    categoryRepository,
  );
  final userRepository = UserRepositoryImpl(UserLocalDataSource(database), preferencesDataSource);

  await categoryRepository.ensureSeeded();
  final currentUser = await userRepository.getCurrentUser();
  if (preferencesDataSource.isFirstLaunch) {
    await preferencesDataSource.markFirstLaunchDone();
  }

  runApp(MoneyTrackerApp(
    appRouter: AppRouter(),
    preferencesDataSource: preferencesDataSource,
    currentUser: currentUser,
    userRepository: userRepository,
    categoryRepository: categoryRepository,
    transactionRepository: transactionRepository,
  ));
}
