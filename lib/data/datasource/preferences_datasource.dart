import 'package:shared_preferences/shared_preferences.dart';

import '../../core/utils/app_exception.dart';

class PreferencesDataSource {
  PreferencesDataSource(this._prefs);

  final SharedPreferences _prefs;

  static const _keyUserName = 'user_name';
  static const _keyCurrency = 'currency';
  static const _keyFirstLaunch = 'first_launch';
  static const defaultUserName = 'saikal';
  static const defaultCurrency = 'сом';

  String get userName {
    try {
      return _prefs.getString(_keyUserName) ?? defaultUserName;
    } catch (_) {
      throw const AppException('Не удалось загрузить настройки');
    }
  }

  String get currency {
    try {
      return _prefs.getString(_keyCurrency) ?? defaultCurrency;
    } catch (_) {
      throw const AppException('Не удалось загрузить настройки');
    }
  }

  bool get isFirstLaunch {
    try {
      return _prefs.getBool(_keyFirstLaunch) ?? true;
    } catch (_) {
      return true;
    }
  }

  Future<void> saveSettings({required String userName, required String currency}) async {
    try {
      await _prefs.setString(_keyUserName, userName);
      await _prefs.setString(_keyCurrency, currency);
    } catch (_) {
      throw const AppException('Не удалось сохранить настройки');
    }
  }

  Future<void> markFirstLaunchDone() async {
    try {
      await _prefs.setBool(_keyFirstLaunch, false);
    } catch (_) {
      throw const AppException('Не удалось сохранить настройки');
    }
  }
}
