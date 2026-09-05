import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const FlutterSecureStorage _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );

  static const String _keyToken = 'jwt_auth_token';
  static const String _keyRefreshToken = 'jwt_refresh_token';
  static const String _keyUserData = 'user_session_data';
  static const String _keyBaseUrl = 'custom_base_url';

  // Save Token
  static Future<void> saveToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  // Get Token
  static Future<String?> getToken() async {
    return await _storage.read(key: _keyToken);
  }

  // Save Refresh Token
  static Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _keyRefreshToken, value: token);
  }

  // Get Refresh Token
  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }

  // Save User JSON
  static Future<void> saveUserData(String jsonString) async {
    await _storage.write(key: _keyUserData, value: jsonString);
  }

  // Get User JSON
  static Future<String?> getUserData() async {
    return await _storage.read(key: _keyUserData);
  }

  // Custom Base URL (useful for development & switching LAN IPs)
  static Future<void> saveBaseUrl(String url) async {
    await _storage.write(key: _keyBaseUrl, value: url);
  }

  static Future<String?> getBaseUrl() async {
    return await _storage.read(key: _keyBaseUrl);
  }

  // Clear Session on Logout
  static Future<void> clearSession() async {
    await _storage.delete(key: _keyToken);
    await _storage.delete(key: _keyRefreshToken);
    await _storage.delete(key: _keyUserData);
  }
}
