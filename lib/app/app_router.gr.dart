// dart format width=80
// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// AutoRouterGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

part of 'app_router.dart';

/// generated route for
/// [CategoriesScreen]
class CategoriesRoute extends PageRouteInfo<void> {
  const CategoriesRoute({List<PageRouteInfo>? children})
    : super(CategoriesRoute.name, initialChildren: children);

  static const String name = 'CategoriesRoute';

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const CategoriesScreen();
    },
  );
}

/// generated route for
/// [CategoryFormScreen]
class CategoryFormRoute extends PageRouteInfo<CategoryFormRouteArgs> {
  CategoryFormRoute({Key? key, int? categoryId, List<PageRouteInfo>? children})
    : super(
        CategoryFormRoute.name,
        args: CategoryFormRouteArgs(key: key, categoryId: categoryId),
        initialChildren: children,
      );

  static const String name = 'CategoryFormRoute';

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      final args = data.argsAs<CategoryFormRouteArgs>(
        orElse: () => const CategoryFormRouteArgs(),
      );
      return CategoryFormScreen(key: args.key, categoryId: args.categoryId);
    },
  );
}

class CategoryFormRouteArgs {
  const CategoryFormRouteArgs({this.key, this.categoryId});

  final Key? key;

  final int? categoryId;

  @override
  String toString() {
    return 'CategoryFormRouteArgs{key: $key, categoryId: $categoryId}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! CategoryFormRouteArgs) return false;
    return key == other.key && categoryId == other.categoryId;
  }

  @override
  int get hashCode => key.hashCode ^ categoryId.hashCode;
}

/// generated route for
/// [HomeScreen]
class HomeRoute extends PageRouteInfo<void> {
  const HomeRoute({List<PageRouteInfo>? children})
    : super(HomeRoute.name, initialChildren: children);

  static const String name = 'HomeRoute';

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const HomeScreen();
    },
  );
}

/// generated route for
/// [SettingsScreen]
class SettingsRoute extends PageRouteInfo<void> {
  const SettingsRoute({List<PageRouteInfo>? children})
    : super(SettingsRoute.name, initialChildren: children);

  static const String name = 'SettingsRoute';

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const SettingsScreen();
    },
  );
}

/// generated route for
/// [TransactionDetailsScreen]
class TransactionDetailsRoute
    extends PageRouteInfo<TransactionDetailsRouteArgs> {
  TransactionDetailsRoute({
    Key? key,
    required Transaction transaction,
    List<PageRouteInfo>? children,
  }) : super(
         TransactionDetailsRoute.name,
         args: TransactionDetailsRouteArgs(key: key, transaction: transaction),
         initialChildren: children,
       );

  static const String name = 'TransactionDetailsRoute';

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      final args = data.argsAs<TransactionDetailsRouteArgs>();
      return TransactionDetailsScreen(
        key: args.key,
        transaction: args.transaction,
      );
    },
  );
}

class TransactionDetailsRouteArgs {
  const TransactionDetailsRouteArgs({this.key, required this.transaction});

  final Key? key;

  final Transaction transaction;

  @override
  String toString() {
    return 'TransactionDetailsRouteArgs{key: $key, transaction: $transaction}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! TransactionDetailsRouteArgs) return false;
    return key == other.key && transaction == other.transaction;
  }

  @override
  int get hashCode => key.hashCode ^ transaction.hashCode;
}

/// generated route for
/// [TransactionFormScreen]
class TransactionFormRoute extends PageRouteInfo<TransactionFormRouteArgs> {
  TransactionFormRoute({
    Key? key,
    Transaction? transaction,
    List<PageRouteInfo>? children,
  }) : super(
         TransactionFormRoute.name,
         args: TransactionFormRouteArgs(key: key, transaction: transaction),
         initialChildren: children,
       );

  static const String name = 'TransactionFormRoute';

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      final args = data.argsAs<TransactionFormRouteArgs>(
        orElse: () => const TransactionFormRouteArgs(),
      );
      return TransactionFormScreen(
        key: args.key,
        transaction: args.transaction,
      );
    },
  );
}

class TransactionFormRouteArgs {
  const TransactionFormRouteArgs({this.key, this.transaction});

  final Key? key;

  final Transaction? transaction;

  @override
  String toString() {
    return 'TransactionFormRouteArgs{key: $key, transaction: $transaction}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! TransactionFormRouteArgs) return false;
    return key == other.key && transaction == other.transaction;
  }

  @override
  int get hashCode => key.hashCode ^ transaction.hashCode;
}

/// generated route for
/// [TransactionsScreen]
class TransactionsRoute extends PageRouteInfo<void> {
  const TransactionsRoute({List<PageRouteInfo>? children})
    : super(TransactionsRoute.name, initialChildren: children);

  static const String name = 'TransactionsRoute';

  static PageInfo page = PageInfo(
    name,
    builder: (data) {
      return const TransactionsScreen();
    },
  );
}
