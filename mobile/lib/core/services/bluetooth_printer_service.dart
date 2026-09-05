import 'package:flutter/foundation.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../../shared/models/order_model.dart';

class BluetoothPrinterService {
  static PaperSize defaultPaperSize = PaperSize.mm58;

  /// Check if bluetooth is enabled on the device
  static Future<bool> isBluetoothEnabled() async {
    if (kIsWeb) return false;
    try {
      return await PrintBluetoothThermal.bluetoothEnabled;
    } catch (_) {
      return false;
    }
  }

  /// Get paired or discoverable bluetooth devices
  static Future<List<BluetoothInfo>> getPairedDevices() async {
    if (kIsWeb) return [];
    try {
      final List<BluetoothInfo> listResult =
          await PrintBluetoothThermal.pairedBluetooths;
      return listResult;
    } catch (_) {
      return [];
    }
  }

  /// Check connection status
  static Future<bool> isConnected() async {
    if (kIsWeb) return false;
    try {
      return await PrintBluetoothThermal.connectionStatus;
    } catch (_) {
      return false;
    }
  }

  /// Connect to a bluetooth device by MAC address
  static Future<bool> connect(String macAddress) async {
    if (kIsWeb) return false;
    try {
      final bool result =
          await PrintBluetoothThermal.connect(macPrinterAddress: macAddress);
      return result;
    } catch (_) {
      return false;
    }
  }

  /// Disconnect printer
  static Future<bool> disconnect() async {
    if (kIsWeb) return false;
    try {
      return await PrintBluetoothThermal.disconnect;
    } catch (_) {
      return false;
    }
  }

  /// Print an order receipt / invoice
  static Future<bool> printOrderReceipt({
    required OrderModel order,
    required String shopName,
    String? shopAddress,
    String? shopPhone,
    PaperSize paperSize = PaperSize.mm58,
  }) async {
    if (kIsWeb) return false;
    try {
      final connected = await isConnected();
      if (!connected) return false;

      final profile = await CapabilityProfile.load();
      final generator = Generator(paperSize, profile);
      List<int> bytes = [];

      // Header
      bytes += generator.text(
        shopName.toUpperCase(),
        styles: const PosStyles(
          align: PosAlign.center,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
          bold: true,
        ),
      );

      if (shopAddress != null && shopAddress.isNotEmpty) {
        bytes += generator.text(
          shopAddress,
          styles: const PosStyles(align: PosAlign.center),
        );
      }
      if (shopPhone != null && shopPhone.isNotEmpty) {
        bytes += generator.text(
          'Tel: $shopPhone',
          styles: const PosStyles(align: PosAlign.center),
        );
      }

      bytes += generator.hr(ch: '=');
      bytes += generator.text(
        'ORDER INVOICE / ESTIMATE',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
      bytes += generator.hr(ch: '-');

      // Order info
      bytes += generator.row([
        PosColumn(text: 'Order #:', width: 4, styles: const PosStyles(bold: true)),
        PosColumn(text: order.orderId, width: 8, styles: const PosStyles(bold: true, align: PosAlign.right)),
      ]);
      bytes += generator.row([
        PosColumn(text: 'Date:', width: 4),
        PosColumn(text: order.orderDate.split('T').first, width: 8, styles: const PosStyles(align: PosAlign.right)),
      ]);
      bytes += generator.row([
        PosColumn(text: 'Due Date:', width: 4),
        PosColumn(text: order.dueDate.split('T').first, width: 8, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);

      if (order.customer != null) {
        bytes += generator.hr(ch: '-');
        bytes += generator.text('Customer Details:', styles: const PosStyles(bold: true));
        bytes += generator.text(order.customer!.name);
        bytes += generator.text('Mob: ${order.customer!.mobile}');
      }

      bytes += generator.hr(ch: '=');
      bytes += generator.row([
        PosColumn(text: 'Item / Service', width: 8, styles: const PosStyles(bold: true)),
        PosColumn(text: 'Amount', width: 4, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);
      bytes += generator.hr(ch: '-');

      // Line items
      for (final item in order.items) {
        bytes += generator.row([
          PosColumn(text: '${item.quantity}x ${item.productName ?? "Service"}', width: 8),
          PosColumn(text: item.total.toStringAsFixed(0), width: 4, styles: const PosStyles(align: PosAlign.right)),
        ]);
      }

      // Add-ons
      for (final addOn in order.addOns) {
        bytes += generator.row([
          PosColumn(text: '+ ${addOn.name ?? "Add-on"}', width: 8),
          PosColumn(text: addOn.total.toStringAsFixed(0), width: 4, styles: const PosStyles(align: PosAlign.right)),
        ]);
      }

      bytes += generator.hr(ch: '-');

      // Totals
      bytes += generator.row([
        PosColumn(text: 'Grand Total:', width: 6, styles: const PosStyles(bold: true)),
        PosColumn(text: 'Rs. ${order.grandTotal.toStringAsFixed(0)}', width: 6, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);
      bytes += generator.row([
        PosColumn(text: 'Advance Paid:', width: 6),
        PosColumn(text: 'Rs. ${order.advancePaid.toStringAsFixed(0)}', width: 6, styles: const PosStyles(align: PosAlign.right)),
      ]);
      bytes += generator.row([
        PosColumn(text: 'Balance Due:', width: 6, styles: const PosStyles(bold: true)),
        PosColumn(text: 'Rs. ${order.balanceDue.toStringAsFixed(0)}', width: 6, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);

      bytes += generator.hr(ch: '=');

      // Barcode for order
      if (order.orderId.isNotEmpty) {
        try {
          bytes += generator.barcode(
            Barcode.code128(order.orderId.codeUnits),
            height: 50,
          );
        } catch (_) {
          bytes += generator.qrcode(order.orderId, size: QRSize.size4);
        }
      }

      bytes += generator.feed(1);
      bytes += generator.text(
        'Thank you for your business!',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
      bytes += generator.text(
        'Please bring this bill during pickup',
        styles: const PosStyles(align: PosAlign.center),
      );
      bytes += generator.feed(2);
      bytes += generator.cut();

      final result = await PrintBluetoothThermal.writeBytes(bytes);
      return result;
    } catch (_) {
      return false;
    }
  }

  /// Print a garment tag / label
  static Future<bool> printGarmentTag({
    required OrderModel order,
    required String shopName,
    PaperSize paperSize = PaperSize.mm58,
  }) async {
    if (kIsWeb) return false;
    try {
      final connected = await isConnected();
      if (!connected) return false;

      final profile = await CapabilityProfile.load();
      final generator = Generator(paperSize, profile);
      List<int> bytes = [];

      bytes += generator.text(
        shopName,
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
      bytes += generator.hr(ch: '*');
      bytes += generator.text(
        'ORDER TAG: #${order.orderId}',
        styles: const PosStyles(
          align: PosAlign.center,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
          bold: true,
        ),
      );
      bytes += generator.hr(ch: '-');

      if (order.customer != null) {
        bytes += generator.text('Client: ${order.customer!.name}', styles: const PosStyles(bold: true));
        bytes += generator.text('Tel: ${order.customer!.mobile}');
      }

      bytes += generator.text('Due Date: ${order.dueDate.split('T').first}', styles: const PosStyles(bold: true));

      if (order.items.isNotEmpty) {
        bytes += generator.text('Item: ${order.items.map((i) => i.productName).join(", ")}');
      }

      bytes += generator.hr(ch: '-');

      // Barcode
      try {
        bytes += generator.barcode(
          Barcode.code128(order.orderId.codeUnits),
          height: 40,
        );
      } catch (_) {
        bytes += generator.qrcode(order.orderId, size: QRSize.size3);
      }

      bytes += generator.feed(2);
      bytes += generator.cut();

      final result = await PrintBluetoothThermal.writeBytes(bytes);
      return result;
    } catch (_) {
      return false;
    }
  }

  /// Print a simple test slip
  static Future<bool> printTestSlip({required String shopName}) async {
    if (kIsWeb) return false;
    try {
      final connected = await isConnected();
      if (!connected) return false;

      final profile = await CapabilityProfile.load();
      final generator = Generator(defaultPaperSize, profile);
      List<int> bytes = [];

      bytes += generator.text(
        shopName,
        styles: const PosStyles(
          align: PosAlign.center,
          bold: true,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
        ),
      );
      bytes += generator.hr(ch: '=');
      bytes += generator.text(
        'BLUETOOTH PRINTER TEST OK',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
      bytes += generator.text(
        'Timestamp: ${DateTime.now()}',
        styles: const PosStyles(align: PosAlign.center),
      );
      bytes += generator.feed(2);
      bytes += generator.cut();

      final result = await PrintBluetoothThermal.writeBytes(bytes);
      return result;
    } catch (_) {
      return false;
    }
  }
}
