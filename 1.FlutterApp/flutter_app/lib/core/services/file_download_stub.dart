import 'dart:io';
import 'dart:typed_data';

Future<bool> saveOrDownloadFilePlatform({
  required String fileName,
  required Uint8List bytes,
  String? mimeType,
}) async {
  try {
    final tempDir = Directory.systemTemp;
    final file = File('${tempDir.path}/$fileName');
    await file.writeAsBytes(bytes);
    return true;
  } catch (e) {
    return false;
  }
}

Future<bool> downloadUrlPlatform({
  required String url,
  required String fileName,
}) async {
  return false;
}
