import 'package:auto_route/auto_route.dart';
import 'package:flutter/widgets.dart';

import '../domain/models/transaction.dart';
import '../presentation/screens/categories/categories_screen.dart';
import '../presentation/screens/category_form/category_form_screen.dart';
import '../presentation/screens/home/home_screen.dart';
import '../presentation/screens/settings/settings_screen.dart';
import '../presentation/screens/transaction_details/transaction_details_screen.dart';
import '../presentation/screens/transaction_form/transaction_form_screen.dart';
import '../presentation/screens/transactions/transactions_screen.dart';

part 'app_router.gr.dart';

@AutoRouterConfig(replaceInRouteName: 'Screen,Route')
class AppRouter extends RootStackRouter {
  @override
  List<AutoRoute> get routes => [
        AutoRoute(page: HomeRoute.page, initial: true),
        AutoRoute(page: TransactionsRoute.page),
        AutoRoute(page: TransactionDetailsRoute.page),
        AutoRoute(page: TransactionFormRoute.page),
        AutoRoute(page: CategoriesRoute.page),
        AutoRoute(page: CategoryFormRoute.page),
        AutoRoute(page: SettingsRoute.page),
      ];
}
