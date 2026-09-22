import '../../../domain/models/category.dart';

sealed class CategoryFormState {
  const CategoryFormState();
}

class CategoryFormLoading extends CategoryFormState {
  const CategoryFormLoading();
}

/// Ready to edit; [existing] is null when creating a new category.
class CategoryFormReady extends CategoryFormState {
  const CategoryFormReady({this.existing, this.isSubmitting = false});

  final Category? existing;
  final bool isSubmitting;

  CategoryFormReady copyWith({bool? isSubmitting}) {
    return CategoryFormReady(
      existing: existing,
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }
}

class CategoryFormSuccess extends CategoryFormState {
  const CategoryFormSuccess();
}

class CategoryFormError extends CategoryFormState {
  const CategoryFormError(this.message);

  final String message;
}
