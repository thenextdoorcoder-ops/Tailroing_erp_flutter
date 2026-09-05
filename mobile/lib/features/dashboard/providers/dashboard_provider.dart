import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/storage/hive_service.dart';
import '../../../core/services/notification_service.dart';
import '../../../shared/models/order_model.dart';

final dashboardProvider = StateNotifierProvider<DashboardNotifier, AsyncValue<DashboardData>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DashboardNotifier(apiClient);
});

class DashboardData {
  final int totalOrdersToday;
  final double revenueToday;
  final double balanceDueTotal;
  final int activeOrdersCount;
  final Map<String, int> ordersByStage;
  final List<OrderModel> recentOrders;
  final List<OrderModel> overdueOrders;
  final int lowStockItemsCount;

  DashboardData({
    this.totalOrdersToday = 0,
    this.revenueToday = 0.0,
    this.balanceDueTotal = 0.0,
    this.activeOrdersCount = 0,
    this.ordersByStage = const {},
    this.recentOrders = const [],
    this.overdueOrders = const [],
    this.lowStockItemsCount = 0,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final recentRaw = json['recentOrders'];
    final recentList = recentRaw is List
        ? recentRaw.map((e) => OrderModel.fromJson(e)).toList()
        : <OrderModel>[];

    final overdueRaw = json['overdueOrdersList'] ?? json['overdueOrders'];
    final overdueList = overdueRaw is List
        ? overdueRaw.map((e) => OrderModel.fromJson(e)).toList()
        : <OrderModel>[];

    final stageMap = <String, int>{};
    if (json['ordersByStage'] is Map) {
      json['ordersByStage'].forEach((k, v) {
        stageMap[k.toString()] = int.tryParse(v.toString()) ?? 0;
      });
    }

    return DashboardData(
      totalOrdersToday: int.tryParse(json['totalOrdersToday']?.toString() ?? '0') ?? 0,
      revenueToday: double.tryParse(json['revenueToday']?.toString() ?? '0') ?? 0.0,
      balanceDueTotal: double.tryParse(json['balanceDueTotal']?.toString() ?? '0') ?? 0.0,
      activeOrdersCount: int.tryParse(json['activeOrdersCount']?.toString() ?? '0') ?? 0,
      ordersByStage: stageMap,
      recentOrders: recentList,
      overdueOrders: overdueList,
      lowStockItemsCount: int.tryParse(json['lowStockItemsCount']?.toString() ?? '0') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalOrdersToday': totalOrdersToday,
      'revenueToday': revenueToday,
      'balanceDueTotal': balanceDueTotal,
      'activeOrdersCount': activeOrdersCount,
      'ordersByStage': ordersByStage,
      'lowStockItemsCount': lowStockItemsCount,
    };
  }
}

class DashboardNotifier extends StateNotifier<AsyncValue<DashboardData>> {
  final ApiClient _apiClient;

  DashboardNotifier(this._apiClient) : super(const AsyncValue.loading()) {
    loadDashboard();
  }

  Future<void> loadDashboard() async {
    // 1. Try local cache first for instant load
    final cached = HiveService.getCachedDashboard();
    if (cached != null) {
      state = AsyncValue.data(DashboardData.fromJson(cached));
    }

    // 2. Fetch fresh data from backend
    try {
      final response = await _apiClient.get(ApiEndpoints.dashboard);
      if (response != null && response is Map<String, dynamic>) {
        final data = DashboardData.fromJson(response);
        await HiveService.cacheDashboard(response);
        state = AsyncValue.data(data);

        // Check and trigger device push alerts for overdue orders
        NotificationService.checkAndNotifyDashboardAlerts(
          overdueCount: data.overdueOrders.length,
          overdueOrders: data.overdueOrders,
          activeOrders: data.activeOrdersCount,
        );
      }
    } catch (e, stack) {
      if (cached == null) {
        state = AsyncValue.error(e, stack);
      }
    }
  }

  Future<void> refresh() async {
    await loadDashboard();
  }
}
