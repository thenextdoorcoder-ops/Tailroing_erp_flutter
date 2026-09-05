import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../shared/models/user_model.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AsyncValue<UserModel?>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthNotifier(apiClient);
});

class AuthNotifier extends StateNotifier<AsyncValue<UserModel?>> {
  final ApiClient _apiClient;

  AuthNotifier(this._apiClient) : super(const AsyncValue.loading()) {
    _apiClient.setOnUnauthorized(() {
      state = const AsyncValue.data(null);
    });
    checkAuth();
  }

  Future<void> checkAuth() async {
    try {
      final token = await SecureStorageService.getToken();
      final userJson = await SecureStorageService.getUserData();

      if (token != null && userJson != null) {
        final user = UserModel.fromJson(jsonDecode(userJson));
        state = AsyncValue.data(user);
      } else {
        state = const AsyncValue.data(null);
      }
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<bool> login(String identifier, String password) async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.post(
        ApiEndpoints.login,
        data: {
          'identifier': identifier.trim(),
          'password': password,
        },
      );

      if (response != null && response['token'] != null) {
        final token = response['token'].toString();
        final user = UserModel.fromJson(response['user']);

        await SecureStorageService.saveToken(token);
        await SecureStorageService.saveUserData(jsonEncode(user.toJson()));

        state = AsyncValue.data(user);
        return true;
      }
      throw Exception('Invalid login response from server');
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.post(ApiEndpoints.logout).catchError((_) => null);
    } catch (_) {}
    await SecureStorageService.clearSession();
    state = const AsyncValue.data(null);
  }
}
