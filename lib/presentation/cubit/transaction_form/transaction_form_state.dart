sealed class TransactionFormState {
  const TransactionFormState();
}

class TransactionFormLoading extends TransactionFormState {
  const TransactionFormLoading();
}

class TransactionFormReady extends TransactionFormState {
  const TransactionFormReady({this.isSubmitting = false});

  final bool isSubmitting;
}

/// Emitted right after a successful *add* (not edit) so the UI can play the
/// Lottie success animation before popping back.
class TransactionFormAddSuccess extends TransactionFormState {
  const TransactionFormAddSuccess();
}

class TransactionFormUpdateSuccess extends TransactionFormState {
  const TransactionFormUpdateSuccess();
}

class TransactionFormError extends TransactionFormState {
  const TransactionFormError(this.message);

  final String message;
}
