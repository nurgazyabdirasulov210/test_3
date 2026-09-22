sealed class SettingsState {
  const SettingsState();
}

class SettingsLoaded extends SettingsState {
  const SettingsLoaded({required this.userName, required this.currency, this.isSaving = false});

  final String userName;
  final String currency;
  final bool isSaving;

  SettingsLoaded copyWith({String? userName, String? currency, bool? isSaving}) {
    return SettingsLoaded(
      userName: userName ?? this.userName,
      currency: currency ?? this.currency,
      isSaving: isSaving ?? this.isSaving,
    );
  }
}

class SettingsError extends SettingsState {
  const SettingsError(this.message);

  final String message;
}
