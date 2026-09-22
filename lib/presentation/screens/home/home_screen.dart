import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../app/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/datasource/preferences_datasource.dart';
import '../../../data/repository/category_repository.dart';
import '../../../data/repository/transaction_repository.dart';
import '../../cubit/home/home_cubit.dart';
import '../../cubit/home/home_state.dart';
import '../../widgets/app_bottom_nav.dart';
import '../../widgets/error_view.dart';
import '../../widgets/transaction_tile.dart';

@RoutePage()
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final HomeCubit _cubit;

  @override
  void initState() {
    super.initState();
    // One-time wiring of the cubit from repositories provided above this route.
    _cubit = HomeCubit(
      transactionRepository: context.read<TransactionRepository>(),
      categoryRepository: context.read<CategoryRepository>(),
      preferencesDataSource: context.read<PreferencesDataSource>(),
    )..load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Settings screen can change the display name/currency in SharedPreferences;
    // re-sync those without re-running the whole totals query.
    _cubit.refreshPreferences();
  }

  @override
  void deactivate() {
    // Home is being removed from the tree (e.g. app backgrounded mid-navigation) —
    // make sure no stale snackbar survives into whatever screen appears next.
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    super.deactivate();
  }

  @override
  void dispose() {
    _cubit.close();
    super.dispose();
  }

  Future<void> _openAndReload(Future<void> Function() push) async {
    await push();
    if (mounted) _cubit.load();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Money Tracker'),
          actions: [
            IconButton(
              tooltip: 'Настройки',
              icon: const Icon(Icons.settings_outlined),
              onPressed: () => _openAndReload(() => context.router.push(const SettingsRoute())),
            ),
          ],
        ),
        body: BlocBuilder<HomeCubit, HomeState>(
          builder: (context, state) {
            return switch (state) {
              HomeInitial() || HomeLoading() => const Center(child: CircularProgressIndicator()),
              HomeError(:final message) => ErrorView(message: message, onRetry: _cubit.load),
              HomeLoaded() => _HomeContent(
                  state: state,
                  onOpenTransaction: (t) => _openAndReload(
                    () => context.router.push(TransactionDetailsRoute(transaction: t)),
                  ),
                  onOpenAll: () =>
                      _openAndReload(() => context.router.push(const TransactionsRoute())),
                ),
            };
          },
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => _openAndReload(() => context.router.push(TransactionFormRoute())),
          child: const Icon(Icons.add),
        ),
        bottomNavigationBar: const AppBottomNav(current: AppTab.home),
      ),
    );
  }
}

class _HomeContent extends StatelessWidget {
  const _HomeContent({required this.state, required this.onOpenTransaction, required this.onOpenAll});

  final HomeLoaded state;
  final void Function(dynamic transaction) onOpenTransaction;
  final VoidCallback onOpenAll;

  @override
  Widget build(BuildContext context) {
    final formatters = AppFormatters(state.currency);
    final isWide = MediaQuery.of(context).size.width > 600;
    final padding = isWide ? 32.0 : 16.0;
    final initial = state.userName.trim().isEmpty ? 'U' : state.userName.trim()[0].toUpperCase();

    return RefreshIndicator(
      onRefresh: () => context.read<HomeCubit>().load(),
      child: ListView(
        padding: EdgeInsets.fromLTRB(padding, 12, padding, padding),
        children: [
          _HelloCard(userName: state.userName, initial: initial),
          const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: _StatCard(label: 'За сегодня', amount: formatters.amount(state.todayTotal)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatCard(label: 'За месяц', amount: formatters.amount(state.monthTotal)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('Последние операции', style: Theme.of(context).textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w800)),
              TextButton(onPressed: onOpenAll, child: const Text('Все операции')),
            ],
          ),
          if (state.recentTransactions.isEmpty)
            const _EmptyBox(text: 'Пока нет операций')
          else
            ...state.recentTransactions.map(
              (t) => TransactionTile(
                transaction: t,
                formatters: formatters,
                onTap: () => onOpenTransaction(t),
              ),
            ),
        ],
      ),
    );
  }
}

class _HelloCard extends StatelessWidget {
  const _HelloCard({required this.userName, required this.initial});

  final String userName;
  final String initial;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.brand, AppColors.brandDark],
        ),
        boxShadow: [
          BoxShadow(color: AppColors.brand.withValues(alpha: 0.28), blurRadius: 24, offset: const Offset(0, 10)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              initial,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Добро пожаловать,',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12)),
                const SizedBox(height: 2),
                Text(
                  '$userName!',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.amount});

  final String label;
  final String amount;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.ink2,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                amount,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyBox extends StatelessWidget {
  const _EmptyBox({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 28),
        child: Center(
          child: Column(
            children: [
              const Text('🧾', style: TextStyle(fontSize: 30)),
              const SizedBox(height: 10),
              Text(text, style: const TextStyle(color: AppColors.ink2, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }
}
