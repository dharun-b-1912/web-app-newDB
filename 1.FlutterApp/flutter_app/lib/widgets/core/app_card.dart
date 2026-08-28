import 'package:flutter/material.dart';
import '../../core/theme/klarna_tokens.dart';

enum AppCardVariant { standard, heroDark, pastelAccent }

/// Reusable Klarna-style Card Surface Component
class AppCard extends StatelessWidget {
  final Widget child;
  final AppCardVariant variant;
  final Color? backgroundColor;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final double radius;

  const AppCard({
    super.key,
    required this.child,
    this.variant = AppCardVariant.standard,
    this.backgroundColor,
    this.padding = const EdgeInsets.all(AppSpacing.xl),
    this.onTap,
    this.radius = AppRadius.card,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    List<BoxShadow> shadow;
    Border? border;

    switch (variant) {
      case AppCardVariant.heroDark:
        bg = AppColors.pillBlack;
        shadow = AppShadows.pillDark;
        border = null;
        break;
      case AppCardVariant.pastelAccent:
        bg = backgroundColor ?? AppColors.mintBg;
        shadow = [];
        border = Border.all(color: AppColors.borderSubtle);
        break;
      case AppCardVariant.standard:
        bg = backgroundColor ?? AppColors.surfaceWhite;
        shadow = AppShadows.softCard;
        border = Border.all(color: AppColors.borderSubtle);
        break;
    }

    Widget content = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: shadow,
        border: border,
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: content,
      );
    }

    return content;
  }
}
