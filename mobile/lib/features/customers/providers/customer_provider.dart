import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/storage/hive_service.dart';
import '../../../shared/models/customer_model.dart';

final customersListProvider = StateNotifierProvider<CustomersNotifier, AsyncValue<List<CustomerModel>>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return CustomersNotifier(apiClient);
});

class CustomersNotifier extends StateNotifier<AsyncValue<List<CustomerModel>>> {
  final ApiClient _apiClient;
  String _searchQuery = '';

  CustomersNotifier(this._apiClient) : super(const AsyncValue.loading()) {
    loadCustomers();
  }

  Future<void> loadCustomers({String? search}) async {
    if (search != null) _searchQuery = search;

    // 1. Hive cache for instant load
    final cached = HiveService.getCachedCustomers();
    if (cached != null && cached.isNotEmpty && _searchQuery.isEmpty) {
      final list = cached.map((e) => CustomerModel.fromJson(Map<String, dynamic>.from(e))).toList();
      state = AsyncValue.data(list);
    }

    try {
      final queryParams = <String, dynamic>{};
      if (_searchQuery.isNotEmpty) {
        queryParams['search'] = _searchQuery;
      }

      final response = await _apiClient.get(
        ApiEndpoints.customers,
        queryParameters: queryParams,
      );

      if (response != null) {
        final rawList = response is List ? response : (response['customers'] as List? ?? []);
        final customers = rawList.map((e) => CustomerModel.fromJson(e)).toList();

        if (_searchQuery.isEmpty) {
          await HiveService.cacheCustomers(rawList);
        }

        state = AsyncValue.data(customers);
      }
    } catch (e, stack) {
      if (state.value == null) {
        state = AsyncValue.error(e, stack);
      }
    }
  }

  Future<bool> createCustomer(Map<String, dynamic> data) async {
    try {
      await _apiClient.post(ApiEndpoints.customers, data: data);
      await loadCustomers();
      return true;
    } catch (_) {
      return false;
    }
  }
}
