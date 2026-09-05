import 'dart:typed_data';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../shared/models/order_model.dart';

class A4InvoicePrintService {
  /// Builds the full A4 PDF Document bytes
  static Future<Uint8List> generateA4InvoiceBytes({
    required OrderModel order,
    required String shopName,
    String? shopAddress,
    String? shopPhone,
    String? shopGst,
  }) async {
    final pdf = pw.Document();
    final font = await PdfGoogleFonts.interRegular();
    final fontBold = await PdfGoogleFonts.interBold();
    final fontMedium = await PdfGoogleFonts.interMedium();
    final currencyFmt = NumberFormat.currency(symbol: 'Rs. ', decimalDigits: 0);

    const primaryColor = PdfColor.fromInt(0xFF6C47FF);
    const darkColor = PdfColor.fromInt(0xFF1A1D2E);
    const grayColor = PdfColor.fromInt(0xFF6E7191);
    const lightGrayColor = PdfColor.fromInt(0xFFF4F5F8);

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Top Brand Banner / Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        shopName.toUpperCase(),
                        style: pw.TextStyle(
                          font: fontBold,
                          fontSize: 22,
                          color: primaryColor,
                        ),
                      ),
                      if (shopAddress != null && shopAddress.isNotEmpty)
                        pw.Text(
                          shopAddress,
                          style: pw.TextStyle(font: font, fontSize: 10, color: grayColor),
                        ),
                      if (shopPhone != null && shopPhone.isNotEmpty)
                        pw.Text(
                          'Phone: $shopPhone',
                          style: pw.TextStyle(font: font, fontSize: 10, color: grayColor),
                        ),
                      if (shopGst != null && shopGst.isNotEmpty)
                        pw.Text(
                          'GSTIN: $shopGst',
                          style: pw.TextStyle(font: fontBold, fontSize: 10, color: darkColor),
                        ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Container(
                        padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: pw.BoxDecoration(
                          color: lightGrayColor,
                          borderRadius: pw.BorderRadius.circular(6),
                        ),
                        child: pw.Text(
                          'TAX INVOICE / ESTIMATE',
                          style: pw.TextStyle(font: fontBold, fontSize: 12, color: primaryColor),
                        ),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Text(
                        'Invoice #: ${order.orderId}',
                        style: pw.TextStyle(font: fontBold, fontSize: 11, color: darkColor),
                      ),
                      pw.Text(
                        'Date: ${order.orderDate.split("T").first}',
                        style: pw.TextStyle(font: font, fontSize: 10, color: grayColor),
                      ),
                      pw.Text(
                        'Due Date: ${order.dueDate.split("T").first}',
                        style: pw.TextStyle(font: fontBold, fontSize: 10, color: PdfColors.red800),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 16),
              pw.Divider(thickness: 1, color: lightGrayColor),
              pw.SizedBox(height: 10),

              // Customer Details & Order Meta
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Container(
                    width: 260,
                    padding: const pw.EdgeInsets.all(10),
                    decoration: pw.BoxDecoration(
                      color: lightGrayColor,
                      borderRadius: pw.BorderRadius.circular(8),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'BILLED TO (CUSTOMER):',
                          style: pw.TextStyle(font: fontBold, fontSize: 9, color: grayColor),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text(
                          order.customer?.name ?? 'Walk-in Customer',
                          style: pw.TextStyle(font: fontBold, fontSize: 12, color: darkColor),
                        ),
                        if (order.customer?.mobile != null)
                          pw.Text(
                            'Mobile: ${order.customer!.mobile}',
                            style: pw.TextStyle(font: font, fontSize: 10, color: darkColor),
                          ),
                        if (order.customer?.address != null && order.customer!.address!.isNotEmpty)
                          pw.Text(
                            'Address: ${order.customer!.address}',
                            style: pw.TextStyle(font: font, fontSize: 9, color: grayColor),
                          ),
                      ],
                    ),
                  ),
                  pw.Container(
                    width: 220,
                    padding: const pw.EdgeInsets.all(10),
                    decoration: pw.BoxDecoration(
                      color: lightGrayColor,
                      borderRadius: pw.BorderRadius.circular(8),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'ORDER STATUS & DELIVERY:',
                          style: pw.TextStyle(font: fontBold, fontSize: 9, color: grayColor),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Row(
                          children: [
                            pw.Text('Status: ', style: pw.TextStyle(font: font, fontSize: 10)),
                            pw.Text(
                              order.status.replaceAll('_', ' '),
                              style: pw.TextStyle(font: fontBold, fontSize: 10, color: primaryColor),
                            ),
                          ],
                        ),
                        pw.Text(
                          'Delivery Option: ${order.deliveryOption}',
                          style: pw.TextStyle(font: font, fontSize: 10),
                        ),
                        if (order.orderingFor != null && order.orderingFor!.isNotEmpty)
                          pw.Text(
                            'Ordering For: ${order.orderingFor}',
                            style: pw.TextStyle(font: font, fontSize: 10),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 16),

              // Items Table
              pw.Text(
                'ITEMIZED TAILORING SERVICES',
                style: pw.TextStyle(font: fontBold, fontSize: 11, color: darkColor),
              ),
              pw.SizedBox(height: 6),

              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
                columnWidths: {
                  0: const pw.FlexColumnWidth(1),
                  1: const pw.FlexColumnWidth(5),
                  2: const pw.FlexColumnWidth(2),
                  3: const pw.FlexColumnWidth(2),
                  4: const pw.FlexColumnWidth(2),
                },
                children: [
                  // Table Header
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: lightGrayColor),
                    children: [
                      _tableCell('#', fontBold, isHeader: true, align: pw.TextAlign.center),
                      _tableCell('Description / Garment', fontBold, isHeader: true),
                      _tableCell('Qty', fontBold, isHeader: true, align: pw.TextAlign.center),
                      _tableCell('Rate', fontBold, isHeader: true, align: pw.TextAlign.right),
                      _tableCell('Total', fontBold, isHeader: true, align: pw.TextAlign.right),
                    ],
                  ),
                  // Items
                  ...order.items.asMap().entries.map((entry) {
                    final idx = entry.key + 1;
                    final item = entry.value;
                    return pw.TableRow(
                      children: [
                        _tableCell('$idx', font, align: pw.TextAlign.center),
                        _tableCell(item.productName ?? 'Stitching Service', fontMedium),
                        _tableCell('${item.quantity}', font, align: pw.TextAlign.center),
                        _tableCell(currencyFmt.format(item.rate), font, align: pw.TextAlign.right),
                        _tableCell(currencyFmt.format(item.total), fontMedium, align: pw.TextAlign.right),
                      ],
                    );
                  }),
                  // Add-Ons
                  ...order.addOns.map((addOn) {
                    return pw.TableRow(
                      children: [
                        _tableCell('+', font, align: pw.TextAlign.center),
                        _tableCell('Add-on: ${addOn.name ?? "Custom Work"}', font, isItalic: true),
                        _tableCell('${addOn.quantity}', font, align: pw.TextAlign.center),
                        _tableCell(currencyFmt.format(addOn.price), font, align: pw.TextAlign.right),
                        _tableCell(currencyFmt.format(addOn.total), font, align: pw.TextAlign.right),
                      ],
                    );
                  }),
                ],
              ),
              pw.SizedBox(height: 16),

              // Summary Box & Payment Status
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  // Barcode & QR Code Verification Block
                  pw.Container(
                    width: 240,
                    padding: const pw.EdgeInsets.all(10),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColors.grey300, width: 0.5),
                      borderRadius: pw.BorderRadius.circular(6),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('Order Verification Code:', style: pw.TextStyle(font: fontBold, fontSize: 9)),
                        pw.SizedBox(height: 6),
                        pw.BarcodeWidget(
                          barcode: pw.Barcode.code128(),
                          data: order.orderId,
                          width: 200,
                          height: 36,
                          drawText: true,
                          textStyle: pw.TextStyle(font: font, fontSize: 8),
                        ),
                        pw.SizedBox(height: 6),
                        pw.Text(
                          'Scan this barcode during garment collection.',
                          style: pw.TextStyle(font: font, fontSize: 8, color: grayColor),
                        ),
                      ],
                    ),
                  ),

                  // Financial Breakdown
                  pw.Container(
                    width: 240,
                    child: pw.Column(
                      children: [
                        _summaryRow('Products Total:', currencyFmt.format(order.productTotal), font),
                        if (order.addOnsTotal > 0)
                          _summaryRow('Add-ons Total:', currencyFmt.format(order.addOnsTotal), font),
                        if (order.discount > 0)
                          _summaryRow('Discount:', '- ${currencyFmt.format(order.discount)}', font, valueColor: PdfColors.green800),
                        if (order.deliveryCharges > 0)
                          _summaryRow('Delivery Charges:', currencyFmt.format(order.deliveryCharges), font),
                        pw.Divider(thickness: 0.5, color: PdfColors.grey400),
                        _summaryRow('Grand Total:', currencyFmt.format(order.grandTotal), fontBold, isLarge: true),
                        _summaryRow('Advance Paid:', currencyFmt.format(order.advancePaid), fontMedium),
                        pw.Container(
                          padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 6),
                          decoration: pw.BoxDecoration(
                            color: order.balanceDue > 0 ? PdfColors.red50 : PdfColors.green50,
                            borderRadius: pw.BorderRadius.circular(4),
                          ),
                          child: _summaryRow(
                            'Balance Due:',
                            currencyFmt.format(order.balanceDue),
                            fontBold,
                            valueColor: order.balanceDue > 0 ? PdfColors.red800 : PdfColors.green800,
                            isLarge: true,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              pw.Spacer(),

              // Terms & Signature Footer
              pw.Divider(thickness: 1, color: lightGrayColor),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Terms & Conditions:', style: pw.TextStyle(font: fontBold, fontSize: 8)),
                      pw.Text('1. Please collect garments within 15 days of due date.', style: pw.TextStyle(font: font, fontSize: 7, color: grayColor)),
                      pw.Text('2. Balance payment is required upon pickup.', style: pw.TextStyle(font: font, fontSize: 7, color: grayColor)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.center,
                    children: [
                      pw.Container(width: 120, height: 1, color: PdfColors.grey400),
                      pw.SizedBox(height: 4),
                      pw.Text('Authorized Signature', style: pw.TextStyle(font: fontBold, fontSize: 8)),
                      pw.Text(shopName, style: pw.TextStyle(font: font, fontSize: 7, color: grayColor)),
                    ],
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  /// Direct Wi-Fi / System Spooler Print (Brother, Epson, HP, AirPrint, Mopria)
  static Future<bool> printA4Invoice({
    required OrderModel order,
    required String shopName,
    String? shopAddress,
    String? shopPhone,
    String? shopGst,
  }) async {
    try {
      final bytes = await generateA4InvoiceBytes(
        order: order,
        shopName: shopName,
        shopAddress: shopAddress,
        shopPhone: shopPhone,
        shopGst: shopGst,
      );

      return await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => bytes,
        name: 'Invoice_${order.orderId}.pdf',
      );
    } catch (_) {
      return false;
    }
  }

  /// Share or Save PDF Invoice (WhatsApp, Email, Drive)
  static Future<void> sharePdfInvoice({
    required OrderModel order,
    required String shopName,
    String? shopAddress,
    String? shopPhone,
    String? shopGst,
  }) async {
    final bytes = await generateA4InvoiceBytes(
      order: order,
      shopName: shopName,
      shopAddress: shopAddress,
      shopPhone: shopPhone,
      shopGst: shopGst,
    );

    await Printing.sharePdf(
      bytes: bytes,
      filename: 'Invoice_${order.orderId}.pdf',
    );
  }

  static pw.Widget _tableCell(
    String text,
    pw.Font font, {
    bool isHeader = false,
    bool isItalic = false,
    pw.TextAlign align = pw.TextAlign.left,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(
          font: font,
          fontSize: isHeader ? 9 : 8.5,
          fontStyle: isItalic ? pw.FontStyle.italic : pw.FontStyle.normal,
        ),
      ),
    );
  }

  static pw.Widget _summaryRow(
    String label,
    String value,
    pw.Font font, {
    PdfColor? valueColor,
    bool isLarge = false,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            label,
            style: pw.TextStyle(font: font, fontSize: isLarge ? 10 : 8.5),
          ),
          pw.Text(
            value,
            style: pw.TextStyle(
              font: font,
              fontSize: isLarge ? 10 : 8.5,
              color: valueColor ?? PdfColors.black,
            ),
          ),
        ],
      ),
    );
  }
}
