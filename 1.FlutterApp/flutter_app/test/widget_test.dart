import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:workforce_os/core/theme/klarna_tokens.dart';

void main() {
  testWidgets('App tokens and UI smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          backgroundColor: AppColors.scaffoldBg,
          body: Center(
            child: Text(
              'JOY PeopleHR',
              style: TextStyle(color: AppColors.primary),
            ),
          ),
        ),
      ),
    );

    expect(find.text('JOY PeopleHR'), findsOneWidget);
  });
}

