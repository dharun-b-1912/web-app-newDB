import 'package:flutter/material.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../widgets/core/app_header.dart';

class PersonalScreen extends StatelessWidget {
  const PersonalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: SingleChildScrollView(
        physics: BouncingScrollPhysics(),
        padding: EdgeInsets.only(bottom: AppSpacing.bottomNavClearance),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppHeader(
              subtitle: "Personal Workspace",
              title: "Personal",
            ),
          ],
        ),
      ),
    );
  }
}
