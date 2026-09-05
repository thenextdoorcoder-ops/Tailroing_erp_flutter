import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/navigation/screens/main_shell_screen.dart';
import '../../features/orders/screens/order_detail_screen.dart';
import '../../features/orders/screens/new_order_wizard_screen.dart';
import '../../features/customers/screens/customer_profile_screen.dart';
import '../../features/customers/screens/customer_form_screen.dart';
import '../../features/measurements/screens/measurement_entry_screen.dart';
import '../../features/attendance/screens/attendance_screen.dart';
import '../../features/inventory/screens/inventory_screen.dart';
import '../../features/expenses/screens/expenses_screen.dart';
import '../../features/reports/screens/reports_screen.dart';
import '../../features/students/screens/students_screen.dart';
import '../../features/enquiries/screens/enquiries_screen.dart';
import '../../features/gallery/screens/gallery_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/settings/screens/printer_settings_screen.dart';
import '../../features/attenders/screens/attenders_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoading = authState.isLoading;
      final isAuthenticated = authState.value != null;
      final isLoggingIn = state.matchedLocation == '/login';

      if (isLoading) return null;

      if (!isAuthenticated && !isLoggingIn) {
        return '/login';
      }

      if (isAuthenticated && isLoggingIn) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const MainShellScreen(initialIndex: 0),
      ),
      GoRoute(
        path: '/orders',
        builder: (context, state) => const MainShellScreen(initialIndex: 1),
      ),
      GoRoute(
        path: '/orders/new',
        builder: (context, state) => const NewOrderWizardScreen(),
      ),
      GoRoute(
        path: '/orders/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return OrderDetailScreen(orderId: id);
        },
      ),
      GoRoute(
        path: '/customers',
        builder: (context, state) => const MainShellScreen(initialIndex: 2),
      ),
      GoRoute(
        path: '/customers/new',
        builder: (context, state) => const CustomerFormScreen(),
      ),
      GoRoute(
        path: '/customers/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return CustomerProfileScreen(customerId: id);
        },
      ),
      GoRoute(
        path: '/workboard',
        builder: (context, state) => const MainShellScreen(initialIndex: 3),
      ),
      GoRoute(
        path: '/measurements/new',
        builder: (context, state) {
          final customerId = state.uri.queryParameters['customerId'];
          final orderId = state.uri.queryParameters['orderId'];
          return MeasurementEntryScreen(customerId: customerId, orderId: orderId);
        },
      ),
      GoRoute(
        path: '/attendance',
        builder: (context, state) => const AttendanceScreen(),
      ),
      GoRoute(
        path: '/inventory',
        builder: (context, state) => const InventoryScreen(),
      ),
      GoRoute(
        path: '/expenses',
        builder: (context, state) => const ExpensesScreen(),
      ),
      GoRoute(
        path: '/reports',
        builder: (context, state) => const ReportsScreen(),
      ),
      GoRoute(
        path: '/students',
        builder: (context, state) => const StudentsScreen(),
      ),
      GoRoute(
        path: '/enquiries',
        builder: (context, state) => const EnquiriesScreen(),
      ),
      GoRoute(
        path: '/gallery',
        builder: (context, state) => const GalleryScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/printer-settings',
        builder: (context, state) => const PrinterSettingsScreen(),
      ),
      GoRoute(
        path: '/attenders',
        builder: (context, state) => const AttendersScreen(),
      ),
    ],
  );
});
