import 'package:hive_flutter/hive_flutter.dart';

class HiveService {
  static const String ordersBoxName = 'cached_orders_box';
  static const String customersBoxName = 'cached_customers_box';
  static const String dashboardBoxName = 'cached_dashboard_box';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(ordersBoxName);
    await Hive.openBox(customersBoxName);
    await Hive.openBox(dashboardBoxName);
  }

  // Orders Cache
  static Box get ordersBox => Hive.box(ordersBoxName);
  static Future<void> cacheOrders(List<dynamic> ordersList) async {
    final box = ordersBox;
    await box.put('orders_list', ordersList);
    await box.put('last_updated', DateTime.now().toIso8601String());
  }

  static List<dynamic>? getCachedOrders() {
    final box = ordersBox;
    final data = box.get('orders_list');
    if (data is List) return data;
    return null;
  }

  // Customers Cache
  static Box get customersBox => Hive.box(customersBoxName);
  static Future<void> cacheCustomers(List<dynamic> customersList) async {
    final box = customersBox;
    await box.put('customers_list', customersList);
  }

  static List<dynamic>? getCachedCustomers() {
    final box = customersBox;
    final data = box.get('customers_list');
    if (data is List) return data;
    return null;
  }

  // Dashboard Cache
  static Box get dashboardBox => Hive.box(dashboardBoxName);
  static Future<void> cacheDashboard(Map<String, dynamic> data) async {
    await dashboardBox.put('metrics', data);
  }

  static Map<String, dynamic>? getCachedDashboard() {
    final data = dashboardBox.get('metrics');
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return null;
  }

  static Future<void> clearAll() async {
    await ordersBox.clear();
    await customersBox.clear();
    await dashboardBox.clear();
  }
}
