import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/storage/hive_service.dart';
import '../../../shared/models/order_model.dart';

final ordersListProvider = StateNotifierProvider<OrdersNotifier, AsyncValue<List<OrderModel>>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return OrdersNotifier(apiClient);
});

class OrdersNotifier extends StateNotifier<AsyncValue<List<OrderModel>>> {
  final ApiClient _apiClient;
  String _currentFilter = 'ALL';
  String _searchQuery = '';

  OrdersNotifier(this._apiClient) : super(const AsyncValue.loading()) {
    loadOrders();
  }

  Future<void> loadOrders({String? status, String? search}) async {
    if (status != null) _currentFilter = status;
    if (search != null) _searchQuery = search;

    // Load from local Hive cache first
    final cached = HiveService.getCachedOrders();
    if (cached != null && cached.isNotEmpty && _searchQuery.isEmpty) {
      final list = cached.map((e) => OrderModel.fromJson(Map<String, dynamic>.from(e))).toList();
      state = AsyncValue.data(_applyFilter(list));
    }

    try {
      final queryParams = <String, dynamic>{};
      if (_currentFilter != 'ALL') {
        queryParams['status'] = _currentFilter;
      }
      if (_searchQuery.isNotEmpty) {
        queryParams['search'] = _searchQuery;
      }

      final response = await _apiClient.get(
        ApiEndpoints.orders,
        queryParameters: queryParams,
      );

      if (response != null) {
        final rawList = response is List ? response : (response['orders'] as List? ?? []);
        final orders = rawList.map((e) => OrderModel.fromJson(e)).toList();

        // Cache when full list is fetched
        if (_currentFilter == 'ALL' && _searchQuery.isEmpty) {
          await HiveService.cacheOrders(rawList);
        }

        state = AsyncValue.data(orders);
      }
    } catch (e, stack) {
      if (state.value == null) {
        state = AsyncValue.error(e, stack);
      }
    }
  }

  List<OrderModel> _applyFilter(List<OrderModel> orders) {
    if (_currentFilter == 'ALL') return orders;
    return orders.where((o) => o.status == _currentFilter).toList();
  }

  Future<bool> updateOrderStatus(String orderId, String newStatus) async {
    try {
      await _apiClient.patch(
        ApiEndpoints.orderStatus(orderId),
        data: {'status': newStatus},
      );
      await loadOrders();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> addPayment(String orderId, double amount, String method, {String? notes}) async {
    try {
      await _apiClient.post(
        '/payments',
        data: {
          'orderId': orderId,
          'amount': amount,
          'paymentMethod': method,
          'notes': notes,
        },
      );
      await loadOrders();
      return true;
    } catch (_) {
      return false;
    }
  }
}
