class Category {
  const Category({required this.id, required this.name, required this.emoji});

  final int id;
  final String name;
  final String emoji;

  Category copyWith({String? name, String? emoji}) {
    return Category(
      id: id,
      name: name ?? this.name,
      emoji: emoji ?? this.emoji,
    );
  }
}
