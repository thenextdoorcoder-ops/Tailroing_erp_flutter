import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../../../shared/models/order_model.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  static bool _isInitialized = false;

  /// Initialize local notification channels
  static Future<void> initialize() async {
    if (_isInitialized) return;

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        debugPrint('[Notification] User tapped: ${details.payload}');
      },
    );

    _isInitialized = true;
  }

  /// Request runtime permissions on Android 13+ and iOS
  static Future<bool> requestPermissions() async {
    if (kIsWeb) return true;

    final androidPlugin = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin != null) {
      final granted = await androidPlugin.requestNotificationsPermission();
      return granted ?? false;
    }
    return true;
  }

  /// Show an instant Overdue Order alert
  static Future<void> showOverdueAlert({
    required int overdueCount,
    required List<OrderModel> overdueOrders,
  }) async {
    if (kIsWeb || overdueCount <= 0) return;

    final sample = overdueOrders.isNotEmpty
        ? ' (e.g. #${overdueOrders.first.orderId} - ${overdueOrders.first.customer?.name ?? "Client"})'
        : '';

    const androidDetails = AndroidNotificationDetails(
      'overdue_orders_channel',
      'Overdue Orders Alerts',
      channelDescription: 'Alerts for tailoring orders past their due date',
      importance: Importance.max,
      priority: Priority.high,
      color: Color(0xFFFF4842),
      enableVibration: true,
      playSound: true,
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );

    await _notifications.show(
      1001,
      '⚠️ $overdueCount Overdue Order${overdueCount > 1 ? "s" : ""}',
      'You have $overdueCount order${overdueCount > 1 ? "s" : ""} past due date$sample. Please check workboard.',
      notificationDetails,
      payload: '/orders?status=OVERDUE',
    );
  }

  /// Show an instant Upcoming Delivery alert (Due Today or Tomorrow)
  static Future<void> showUpcomingDeliveryAlert({
    required int upcomingCount,
  }) async {
    if (kIsWeb || upcomingCount <= 0) return;

    const androidDetails = AndroidNotificationDetails(
      'delivery_due_channel',
      'Delivery Due Alerts',
      channelDescription: 'Reminders for orders due for delivery today or soon',
      importance: Importance.high,
      priority: Priority.high,
      color: Color(0xFF8B5CF6),
      enableVibration: true,
      playSound: true,
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );

    await _notifications.show(
      1002,
      '🚚 $upcomingCount Delivery Due Soon',
      '$upcomingCount garment order${upcomingCount > 1 ? "s are" : " is"} scheduled for delivery today/tomorrow.',
      notificationDetails,
      payload: '/orders',
    );
  }

  /// Check active dashboard data and trigger appropriate device notifications
  static void checkAndNotifyDashboardAlerts({
    required int overdueCount,
    required List<OrderModel> overdueOrders,
    required int activeOrders,
  }) {
    if (overdueCount > 0) {
      showOverdueAlert(
        overdueCount: overdueCount,
        overdueOrders: overdueOrders,
      );
    }
  }
}
