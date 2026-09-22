import 'category.dart';

class Transaction {
  const Transaction({
    required this.id,
    required this.userId,
    required this.categoryId,
    required this.title,
    required this.amount,
    required this.description,
    required this.createdAt,
    this.category,
  });

  final int id;
  final int userId;
  final int categoryId;
  final String title;
  final double amount;
  final String? description;
  final DateTime createdAt;

  /// Populated when a transaction is joined with its category for display.
  final Category? category;

  Transaction copyWith({
    int? categoryId,
    String? title,
    double? amount,
    String? description,
    Category? category,
  }) {
    return Transaction(
      id: id,
      userId: userId,
      categoryId: categoryId ?? this.categoryId,
      title: title ?? this.title,
      amount: amount ?? this.amount,
      description: description ?? this.description,
      createdAt: createdAt,
      category: category ?? this.category,
    );
  }
}
