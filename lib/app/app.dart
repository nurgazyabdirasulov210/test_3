import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../core/theme/app_theme.dart';
import '../data/datasource/preferences_datasource.dart';
import '../data/repository/category_repository.dart';
import '../data/repository/transaction_repository.dart';
import '../data/repository/user_repository.dart';
import '../domain/models/user.dart';
import 'app_router.dart';

class MoneyTrackerApp extends StatelessWidget {
  const MoneyTrackerApp({
    super.key,
    required this.appRouter,
    required this.preferencesDataSource,
    required this.currentUser,
    required this.userRepository,
    required this.categoryRepository,
    required this.transactionRepository,
  });

  final AppRouter appRouter;
  final PreferencesDataSource preferencesDataSource;
  final User currentUser;
  final UserRepository userRepository;
  final CategoryRepository categoryRepository;
  final TransactionRepository transactionRepository;

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<PreferencesDataSource>.value(value: preferencesDataSource),
        RepositoryProvider<User>.value(value: currentUser),
        RepositoryProvider<UserRepository>.value(value: userRepository),
        RepositoryProvider<CategoryRepository>.value(value: categoryRepository),
        RepositoryProvider<TransactionRepository>.value(value: transactionRepository),
      ],
      child: MaterialApp.router(
        title: 'Money Tracker',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        routerConfig: appRouter.config(),
      ),
    );
  }
}
