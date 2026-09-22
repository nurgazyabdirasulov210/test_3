import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/app_exception.dart';
import '../../../data/datasource/preferences_datasource.dart';
import 'settings_state.dart';

class SettingsCubit extends Cubit<SettingsState> {
  SettingsCubit({required PreferencesDataSource preferencesDataSource})
      : _preferencesDataSource = preferencesDataSource,
        super(SettingsLoaded(
          userName: preferencesDataSource.userName,
          currency: preferencesDataSource.currency,
        ));

  final PreferencesDataSource _preferencesDataSource;

  Future<void> save({required String userName, required String currency}) async {
    final current = state;
    if (current is! SettingsLoaded) return;
    emit(current.copyWith(isSaving: true));
    try {
      await _preferencesDataSource.saveSettings(userName: userName, currency: currency);
      emit(SettingsLoaded(userName: userName, currency: currency));
    } on AppException catch (e) {
      emit(SettingsError(e.message));
      emit(current.copyWith(isSaving: false));
    } catch (_) {
      emit(const SettingsError('Не удалось сохранить настройки'));
      emit(current.copyWith(isSaving: false));
    }
  }
}
