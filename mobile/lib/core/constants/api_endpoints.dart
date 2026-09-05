import 'package:flutter/foundation.dart';

class ApiEndpoints {
  // Default Base URL: 'localhost' for Web & Desktop, '10.0.2.2' for Android Emulator.
  // In Settings screen, user can change this to their LAN IP (e.g., http://192.168.1.5:5000/api) or Cloud URL.
  static String get defaultBaseUrl =>
      kIsWeb ? 'http://localhost:5000/api' : 'http://10.0.2.2:5000/api';

  // Auth
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String refreshToken = '/auth/refresh-token';

  // Dashboard & Metrics
  static const String dashboard = '/dashboard';
  static const String dashboardMetrics = '/dashboard/metrics';

  // Orders
  static const String orders = '/orders';
  static String orderDetail(String id) => '/orders/$id';
  static String orderStatus(String id) => '/orders/$id/status';
  static String orderInvoice(String id) => '/pdf/order/$id';
  static String orderVoiceNote(String id) => '/voice-notes/$id';
  static String orderPayments(String id) => '/payments/order/$id';

  // Customers
  static const String customers = '/customers';
  static String customerDetail(String id) => '/customers/$id';
  static String customerMeasurements(String id) => '/measurements/customer/$id';

  // Measurements
  static const String measurements = '/measurements';
  static String measurementDetail(String id) => '/measurements/$id';

  // Products & Categories
  static const String categories = '/categories';
  static const String subCategories = '/sub-categories';
  static const String products = '/products';
  static const String addOns = '/add-ons';

  // Inventory
  static const String items = '/items';
  static const String units = '/units';
  static String itemDetail(String id) => '/items/$id';

  // Workboard & Assignments
  static const String workAssignments = '/work-assignments';
  static String workAssignmentDetail(String id) => '/work-assignments/$id';

  // Attendance
  static const String attendance = '/attendance';
  static const String attendanceToday = '/attendance/today';
  static const String attendanceCheckIn = '/attendance/check-in';
  static const String attendanceCheckOut = '/attendance/check-out';

  // Expenses
  static const String expenses = '/expenses';
  static const String expenseCategories = '/expenses/categories';

  // Reports
  static const String reports = '/reports';
  static const String reportRevenue = '/reports/revenue';
  static const String reportOrders = '/reports/orders';
  static const String reportExpenses = '/reports/expenses';

  // Students & Courses
  static const String courses = '/courses';
  static const String students = '/students';
  static String studentDetail(String id) => '/students/$id';
  static String studentPayments(String id) => '/students/$id/payments';

  // Enquiries
  static const String enquiries = '/enquiries';

  // Users & Staff
  static const String users = '/users';
  static const String staff = '/users/staff';

  // Attenders
  static const String attenders = '/attenders';
  static String attenderDetail(String id) => '/attenders/$id';

  // Gallery
  static const String shopGallery = '/gallery/shop';
  static String customerGallery(String customerId) => '/gallery/customer/$customerId';
  static const String blouseGallery = '/public/blouse-gallery';

  // Payments
  static const String payments = '/payments';

  // FCM Device Token
  static const String fcmToken = '/push/fcm-token';
}
