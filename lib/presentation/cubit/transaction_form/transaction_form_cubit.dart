import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/app_exception.dart';
import '../../../data/repository/category_repository.dart';
import '../../../data/repository/transaction_repository.dart';
import '../../../domain/models/category.dart';
import '../../../domain/models/transaction.dart';
import 'transaction_form_state.dart';

class TransactionFormCubit extends Cubit<TransactionFormState> {
  TransactionFormCubit({
    required TransactionRepository transactionRepository,
    required CategoryRepository categoryRepository,
    required this.userId,
    this.editingTransaction,
  })  : _transactionRepository = transactionRepository,
        _categoryRepository = categoryRepository,
        super(const TransactionFormLoading()) {
    _loadCategories();
  }

  final TransactionRepository _transactionRepository;
  final CategoryRepository _categoryRepository;
  final int userId;
  final Transaction? editingTransaction;

  List<Category> categories = [];

  bool get isEditing => editingTransaction != null;

  Future<void> _loadCategories() async {
    try {
      categories = await _categoryRepository.getCategories();
      emit(const TransactionFormReady());
    } on AppException catch (e) {
      emit(TransactionFormError(e.message));
    } catch (_) {
      emit(const TransactionFormError('Не удалось загрузить категории'));
    }
  }

  Future<void> submit({
    required String title,
    required double amount,
    required int categoryId,
    required String? description,
  }) async {
    emit(const TransactionFormReady(isSubmitting: true));
    try {
      if (editingTransaction == null) {
        await _transactionRepository.addTransaction(
          userId: userId,
          categoryId: categoryId,
          title: title,
          amount: amount,
          description: description,
        );
        emit(const TransactionFormAddSuccess());
      } else {
        await _transactionRepository.updateTransaction(
          editingTransaction!.copyWith(
            categoryId: categoryId,
            title: title,
            amount: amount,
            description: description,
          ),
        );
        emit(const TransactionFormUpdateSuccess());
      }
    } on AppException catch (e) {
      emit(TransactionFormError(e.message));
      emit(const TransactionFormReady());
    } catch (_) {
      emit(const TransactionFormError('Не удалось сохранить расход'));
      emit(const TransactionFormReady());
    }
  }
}
