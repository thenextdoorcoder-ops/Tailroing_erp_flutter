import 'package:url_launcher/url_launcher.dart';

class WhatsAppService {
  /// Returns a templated message for the given order status stage
  static String buildOrderMessage({
    required String customerName,
    required String orderId,
    required String status,
    required String shopName,
    List<String> itemNames = const [],
  }) {
    final items = itemNames.isNotEmpty ? itemNames.join(', ') : 'your order';
    switch (status) {
      case 'ORDER_CREATED':
        return '🌟 Hello *$customerName*! 🌟\n\n'
            'Great news! Your custom clothing journey with *$shopName* has begun. '
            'We\'ve accepted your order, and our skilled artisans are eager to bring your vision to life. 🧵✨\n\n'
            '📦 *Order Details:*\n'
            '- Order Number: *$orderId*\n'
            '- Items: $items\n\n'
            'Stay tuned for updates as we craft each piece with precision and care. '
            'Thank you for choosing *$shopName*! 🛍️';

      case 'DESIGNING_STARTED':
        return '✏️ Hello *$customerName*! ✏️\n\n'
            'Exciting news! Our designer has started working on your design for $items. '
            'Your vision is coming to life! 🎨\n\n'
            '📦 Order Number: *$orderId*\n\n'
            'We\'ll keep you posted as we progress. Stay tuned! 🌈';

      case 'DESIGNING_COMPLETED':
        return '✅ Hello *$customerName*!\n\n'
            'The design phase for your $items is complete! 🎉 '
            'Our team is now preparing for the next stage.\n\n'
            '📦 Order Number: *$orderId*\n\n'
            'We\'ll notify you as we move forward. Thank you for your patience! 🙏';

      case 'CUTTING_STARTED':
        return '✂️ Hello *$customerName*! ✂️\n\n'
            'Your $items is now under the expert hands of our cutting master at *$shopName*, '
            'ready to be shaped into a masterpiece. 🪡\n\n'
            '📦 *Order Details:*\n'
            '- Order Number: *$orderId*\n\n'
            'We\'ll ensure every stitch reflects your unique style. Stay tuned for more updates! 🌈\n\n'
            '_You\'ll receive separate notifications for other items within your order._';

      case 'CUTTING_COMPLETED':
        return '✅ Hello *$customerName*!\n\n'
            'The cutting for your $items is done! 🎯 '
            'Next up — stitching!\n\n'
            '📦 Order Number: *$orderId*\n\n'
            'Almost there! 💪';

      case 'STITCHING_STARTED':
        return '🧵 Hello *$customerName*! 🧵\n\n'
            'Our skilled tailor has begun stitching your $items with great care and precision at *$shopName*. '
            'Every stitch is being made to perfection! 👗\n\n'
            '📦 Order Number: *$orderId*\n\n'
            'We promise to make it worth the wait! Stay tuned. ⏳';

      case 'STITCHING_COMPLETED':
        return '🎉 Hello *$customerName*! 🎉\n\n'
            'Your $items has been stitched to perfection! '
            'We\'re now doing final quality checks. 🔍✨\n\n'
            '📦 Order Number: *$orderId*\n\n'
            'Almost ready for you! 😊';

      case 'READY_TO_DELIVER':
        return '🎊 Great News, *$customerName*! 🎊\n\n'
            'Your order is *READY* for pickup/delivery! 🚀\n\n'
            '📦 *Order Number: $orderId*\n'
            '🛍️ Items: $items\n\n'
            'Please visit *$shopName* at your convenience to collect your beautiful garment. '
            'Don\'t forget to bring your balance payment! 💳\n\n'
            'We look forward to seeing you! 🌟';

      case 'DELIVERED':
        return '💖 Hello *$customerName*! 💖\n\n'
            'Your order #$orderId has been successfully delivered. '
            'We hope you love your new garment from *$shopName*! 🌟\n\n'
            'We\'d love to hear your feedback! ⭐⭐⭐⭐⭐\n\n'
            '_Thank you for choosing us. We look forward to serving you again!_ 🙏';

      default:
        return 'Hello *$customerName*!\n\n'
            'This is an update regarding your order #$orderId with *$shopName*.\n\n'
            'Status: *${status.replaceAll("_", " ")}*\n\n'
            'Thank you for choosing us!';
    }
  }

  /// Opens WhatsApp with a pre-filled message for the given phone number
  static Future<bool> sendMessage({
    required String phone,
    required String message,
  }) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final fullPhone = cleanPhone.startsWith('91') ? cleanPhone : '91$cleanPhone';
    final encoded = Uri.encodeComponent(message);
    final url = Uri.parse('https://wa.me/$fullPhone?text=$encoded');

    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
      return true;
    }
    return false;
  }
}
