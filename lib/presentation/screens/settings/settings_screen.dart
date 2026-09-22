import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../data/datasource/preferences_datasource.dart';
import '../../cubit/settings/settings_cubit.dart';
import '../../cubit/settings/settings_state.dart';
import '../../widgets/app_bottom_nav.dart';
import '../../widgets/field_label.dart';

@RoutePage()
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) =>
          SettingsCubit(preferencesDataSource: context.read<PreferencesDataSource>()),
      child: const _SettingsView(),
    );
  }
}

class _SettingsView extends StatefulWidget {
  const _SettingsView();

  @override
  State<_SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<_SettingsView> {
  late final TextEditingController _nameController;
  late final TextEditingController _currencyController;

  @override
  void initState() {
    super.initState();
    final state = context.read<SettingsCubit>().state as SettingsLoaded;
    _nameController = TextEditingController(text: state.userName);
    _currencyController = TextEditingController(text: state.currency);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _currencyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Настройки')),
      body: BlocConsumer<SettingsCubit, SettingsState>(
        listener: (context, state) {
          if (state is SettingsError) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message)));
          }
        },
        builder: (context, state) {
          final isSaving = state is SettingsLoaded && state.isSaving;
          final isWide = MediaQuery.of(context).size.width > 600;
          return SingleChildScrollView(
            padding: EdgeInsets.all(isWide ? 32 : 16),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: isWide ? 480 : double.infinity),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const FieldLabel('Имя'),
                          TextField(controller: _nameController),
                          const SizedBox(height: 16),
                          const FieldLabel('Валюта'),
                          TextField(controller: _currencyController),
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: isSaving
                                ? null
                                : () async {
                                    final name = _nameController.text.trim();
                                    final currency = _currencyController.text.trim();
                                    await context.read<SettingsCubit>().save(
                                          userName: name.isEmpty
                                              ? PreferencesDataSource.defaultUserName
                                              : name,
                                          currency: currency.isEmpty
                                              ? PreferencesDataSource.defaultCurrency
                                              : currency,
                                        );
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Настройки сохранены')));
                                    }
                                  },
                            child: isSaving
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white),
                                  )
                                : const Text('Сохранить'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: const AppBottomNav(current: AppTab.settings),
    );
  }
}
