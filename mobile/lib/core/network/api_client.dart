import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/api_endpoints.dart';
import '../storage/secure_storage.dart';
import 'api_exception.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

class ApiClient {
  late final Dio _dio;
  VoidCallback? _onUnauthorized;

  void setOnUnauthorized(VoidCallback callback) {
    _onUnauthorized = callback;
  }

  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiEndpoints.defaultBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Dynamic Base URL check (allows user to change server IP on the fly)
          final customUrl = await SecureStorageService.getBaseUrl();
          if (customUrl != null && customUrl.isNotEmpty && (!kIsWeb || !customUrl.contains('10.0.2.2'))) {
            options.baseUrl = customUrl;
          } else {
            options.baseUrl = ApiEndpoints.defaultBaseUrl;
          }

          // Attach Bearer Token if available
          final token = await SecureStorageService.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          final customException = _handleDioError(e);
          return handler.reject(
            DioException(
              requestOptions: e.requestOptions,
              error: customException,
              response: e.response,
              type: e.type,
            ),
          );
        },
      ),
    );
  }

  Dio get dio => _dio;

  // GET Request
  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : _handleDioError(e);
    }
  }

  // POST Request
  Future<dynamic> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : _handleDioError(e);
    }
  }

  // PUT Request
  Future<dynamic> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : _handleDioError(e);
    }
  }

  // PATCH Request
  Future<dynamic> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.patch(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : _handleDioError(e);
    }
  }

  // DELETE Request
  Future<dynamic> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : _handleDioError(e);
    }
  }

  ApiException _handleDioError(DioException error) {
    String message = 'Something went wrong. Please try again.';
    int? statusCode = error.response?.statusCode;

    if (statusCode == 401) {
      message = 'Session expired. Please log in again.';
      SecureStorageService.clearSession();
      _onUnauthorized?.call();
    } else if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      message = 'Connection timeout. Please check your internet connection.';
    } else if (error.type == DioExceptionType.connectionError) {
      message = 'Unable to connect to server. Check server address in Settings.';
    } else if (error.response != null) {
      final data = error.response?.data;
      if (data is Map && data.containsKey('details') && data['details'] is Map) {
        final details = data['details'] as Map;
        final detailMsgs = details.values.map((v) => v.toString()).join(', ');
        if (detailMsgs.isNotEmpty) {
          message = detailMsgs;
        } else if (data.containsKey('error')) {
          message = data['error'].toString();
        }
      } else if (data is Map && data.containsKey('error')) {
        message = data['error'].toString();
      } else if (data is Map && data.containsKey('message')) {
        message = data['message'].toString();
      } else if (statusCode == 403) {
        message = 'Access denied. You do not have permission for this action.';
      } else if (statusCode == 404) {
        message = 'Requested resource was not found.';
      } else if (statusCode == 500) {
        message = 'Internal server error. Please try again later.';
      }
    }

    return ApiException(
      message: message,
      statusCode: statusCode,
      data: error.response?.data,
    );
  }
}
