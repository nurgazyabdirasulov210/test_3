class CategoryPreset {
  const CategoryPreset(this.name, this.emoji);

  final String name;
  final String emoji;
}

/// Seeded into the database on first launch.
const List<CategoryPreset> defaultCategoryPresets = [
  CategoryPreset('Еда', '🍔'),
  CategoryPreset('Транспорт', '🚕'),
  CategoryPreset('Покупки', '🛒'),
  CategoryPreset('Развлечения', '🎮'),
  CategoryPreset('Здоровье', '💊'),
  CategoryPreset('Образование', '📚'),
  CategoryPreset('Дом', '🏠'),
  CategoryPreset('Другое', '📦'),
];

/// Offered when creating/editing a category so the user isn't stuck typing an emoji.
const List<String> pickableEmojis = [
  '🍔', '🚕', '🛒', '🎮', '💊', '📚', '🏠', '📦',
  '💵', '🎁', '✈️', '☕', '🐾', '⚽', '🎵', '💡',
];
