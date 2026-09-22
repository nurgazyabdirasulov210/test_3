import 'package:flutter/material.dart';

class CategoryChipPicker extends StatelessWidget {
  const CategoryChipPicker({
    super.key,
    required this.emojis,
    required this.selected,
    required this.onSelected,
  });

  final List<String> emojis;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: emojis.map((emoji) {
        final isSelected = emoji == selected;
        return ChoiceChip(
          label: Text(emoji, style: const TextStyle(fontSize: 18)),
          selected: isSelected,
          onSelected: (_) => onSelected(emoji),
        );
      }).toList(),
    );
  }
}
