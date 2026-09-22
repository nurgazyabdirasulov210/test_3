import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';

import '../../app/app_router.dart';

enum AppTab { home, transactions, categories, settings }

/// Bottom navigation shared by the four top-level screens (Home, Transactions,
/// Categories, Settings), matching the approved prototype. Detail/edit forms
/// are pushed full-screen on top and intentionally don't show it.
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({super.key, required this.current});

  final AppTab current;

  void _go(BuildContext context, AppTab tab) {
    if (tab == current) return;
    switch (tab) {
      case AppTab.home:
        context.router.replace(const HomeRoute());
      case AppTab.transactions:
        context.router.replace(const TransactionsRoute());
      case AppTab.categories:
        context.router.replace(const CategoriesRoute());
      case AppTab.settings:
        context.router.replace(const SettingsRoute());
    }
  }

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: current.index,
      onTap: (index) => _go(context, AppTab.values[index]),
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'Главная'),
        BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), label: 'Операции'),
        BottomNavigationBarItem(icon: Icon(Icons.grid_view_outlined), label: 'Категории'),
        BottomNavigationBarItem(icon: Icon(Icons.settings_outlined), label: 'Настройки'),
      ],
    );
  }
}
