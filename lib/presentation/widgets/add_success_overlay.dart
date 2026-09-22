import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

/// Plays the success checkmark Lottie animation full-screen for a moment
/// after a new transaction is saved, then resolves.
Future<void> showAddSuccessOverlay(BuildContext context) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withValues(alpha: 0.35),
    transitionDuration: const Duration(milliseconds: 200),
    pageBuilder: (context, animation, secondaryAnimation) {
      return _AddSuccessOverlayContent();
    },
  );
}

class _AddSuccessOverlayContent extends StatefulWidget {
  @override
  State<_AddSuccessOverlayContent> createState() => _AddSuccessOverlayContentState();
}

class _AddSuccessOverlayContentState extends State<_AddSuccessOverlayContent> {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: 220,
          height: 220,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Lottie.asset(
            'assets/lottie/success_check.json',
            repeat: false,
            onLoaded: (composition) {
              Future.delayed(composition.duration, () {
                if (!mounted) return;
                final navigator = Navigator.of(context);
                if (navigator.canPop()) navigator.pop();
              });
            },
          ),
        ),
      ),
    );
  }
}
