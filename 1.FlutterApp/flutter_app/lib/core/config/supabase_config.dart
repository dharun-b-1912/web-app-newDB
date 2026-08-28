/// WorkForceOS — Supabase Project Configuration
///
/// Real credentials embedded as defaults so standard `flutter run` works immediately.
/// Can be overridden at build time via --dart-define if needed:
///   flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co \
///               --dart-define=SUPABASE_ANON_KEY=sb_publishable_...
class SupabaseConfig {
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://wmqjmyzzamgxyeuotbki.supabase.co',
  );

  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'sb_publishable_gKFzBDfNlQk5OkjhKAeBvQ_BraH24xv',
  );

  static bool get isConfigured =>
      url.isNotEmpty &&
      url.startsWith('https://') &&
      anonKey.isNotEmpty &&
      anonKey.startsWith('sb_publishable_');
}
