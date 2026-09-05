import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ktailoring_erp/shared/models/user_model.dart';
import 'package:ktailoring_erp/shared/models/order_model.dart';
import 'package:ktailoring_erp/shared/models/customer_model.dart';
import 'package:ktailoring_erp/shared/widgets/status_badge.dart';

void main() {
  group('Model & Widget Unit Tests', () {
    test('UserModel parse JSON correctly', () {
      final user = UserModel.fromJson({
        'id': 'user-123',
        'firstName': 'Sathish',
        'lastName': 'Kumar',
        'email': 'admin@ktown.com',
        'role': 'TAILOR_ADMIN',
        'shopName': 'KTown Aari Works',
      });

      expect(user.id, 'user-123');
      expect(user.fullName, 'Sathish Kumar');
      expect(user.isAdmin, true);
      expect(user.isStaff, false);
    });

    test('CustomerModel initials computation', () {
      final customer = CustomerModel(
        id: 'cust-1',
        name: 'Priyadarshini K',
        mobile: '9876543210',
      );

      expect(customer.initials, 'PK');
    });

    test('OrderModel financial computation', () {
      final order = OrderModel(
        id: 'ord-1',
        orderId: 'ORD-1001',
        customerId: 'cust-1',
        status: 'ORDER_CREATED',
        deliveryOption: 'EXPRESS',
        orderDate: DateTime.now().toIso8601String(),
        dueDate: DateTime.now().add(const Duration(days: 3)).toIso8601String(),
        grandTotal: 3500.0,
        advancePaid: 1000.0,
        balanceDue: 2500.0,
      );

      expect(order.orderId, 'ORD-1001');
      expect(order.grandTotal, 3500.0);
      expect(order.balanceDue, 2500.0);
      expect(order.isOverdue, false);
    });

    testWidgets('StatusBadge renders stage text and indicator dot', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(status: 'STITCHING_STARTED'),
          ),
        ),
      );

      expect(find.text('Stitching in Progress'), findsOneWidget);
    });
  });
}
