import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../shared/models/order_model.dart';

final workboardProvider = StateNotifierProvider<WorkboardNotifier, AsyncValue<Map<String, List<OrderModel>>>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return WorkboardNotifier(apiClient);
});

class WorkboardNotifier extends StateNotifier<AsyncValue<Map<String, List<OrderModel>>>> {
  final ApiClient _apiClient;

  WorkboardNotifier(this._apiClient) : super(const AsyncValue.loading()) {
    loadWorkboard();
  }

  Future<void> loadWorkboard() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.orders);
      if (res != null) {
        final rawList = res is List ? res : (res['orders'] as List? ?? []);
        final allOrders = rawList.map((e) => OrderModel.fromJson(e)).toList();

        final grouped = <String, List<OrderModel>>{
          'ORDER_CREATED': [],
          'DESIGNING_STARTED': [],
          'CUTTING_STARTED': [],
          'STITCHING_STARTED': [],
          'READY_TO_DELIVER': [],
        };

        for (var order in allOrders) {
          if (grouped.containsKey(order.status)) {
            grouped[order.status]!.add(order);
          }
        }

        state = AsyncValue.data(grouped);
      }
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<bool> advanceOrder(String orderId, String newStatus) async {
    try {
      await _apiClient.patch(
        ApiEndpoints.orderStatus(orderId),
        data: {'status': newStatus},
      );
      await loadWorkboard();
      return true;
    } catch (_) {
      return false;
    }
  }
}
