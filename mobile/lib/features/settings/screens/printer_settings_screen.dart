import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/bluetooth_printer_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/custom_button.dart';

class PrinterSettingsScreen extends StatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  bool _isLoading = false;
  bool _isConnected = false;
  bool _isBtEnabled = false;
  String? _connectedMac;
  List<BluetoothInfo> _devices = [];
  PaperSize _paperSize = PaperSize.mm58;

  @override
  void initState() {
    super.initState();
    _checkStatusAndScan();
  }

  Future<void> _checkStatusAndScan() async {
    if (kIsWeb) return;
    setState(() => _isLoading = true);

    final btEnabled = await BluetoothPrinterService.isBluetoothEnabled();
    final connected = await BluetoothPrinterService.isConnected();
    final devices = await BluetoothPrinterService.getPairedDevices();

    if (mounted) {
      setState(() {
        _isBtEnabled = btEnabled;
        _isConnected = connected;
        _devices = devices;
        _isLoading = false;
      });
    }
  }

  Future<void> _connect(BluetoothInfo device) async {
    setState(() => _isLoading = true);
    final ok = await BluetoothPrinterService.connect(device.macAdress);
    if (mounted) {
      setState(() {
        _isConnected = ok;
        if (ok) _connectedMac = device.macAdress;
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ok
              ? 'Connected to ${device.name}'
              : 'Failed to connect to ${device.name}'),
          backgroundColor: ok ? AppColors.success : AppColors.error,
        ),
      );
    }
  }

  Future<void> _disconnect() async {
    setState(() => _isLoading = true);
    await BluetoothPrinterService.disconnect();
    if (mounted) {
      setState(() {
        _isConnected = false;
        _connectedMac = null;
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Printer disconnected')),
      );
    }
  }

  Future<void> _testPrint() async {
    if (!_isConnected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please connect to a printer first'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    final ok = await BluetoothPrinterService.printTestSlip(
      shopName: 'KTown Aari Works',
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ok ? 'Test print sent!' : 'Print command failed'),
          backgroundColor: ok ? AppColors.success : AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (kIsWeb) {
      return Scaffold(
        appBar: AppBar(title: const Text('Bluetooth Printer')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.bluetooth_searching,
                      size: 54, color: AppColors.primary),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Hardware Bluetooth Feature',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  'Thermal receipt & barcode tag printing connects over Bluetooth on your Android mobile / tablet device.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark
                        ? AppColors.textSecondaryDark
                        : AppColors.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bluetooth Thermal Printer'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Scan Devices',
            onPressed: _checkStatusAndScan,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _checkStatusAndScan,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Status Card
            AppCard(
              accentColor: _isConnected ? AppColors.success : AppColors.warning,
              hasAccentBorder: true,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: (_isConnected ? AppColors.success : AppColors.warning)
                          .withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _isConnected ? Icons.print : Icons.print_disabled,
                      color: _isConnected ? AppColors.success : AppColors.warning,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isConnected ? 'Printer Connected' : 'No Printer Connected',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _isBtEnabled
                              ? 'Bluetooth is active'
                              : 'Please turn on Bluetooth in device settings',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? AppColors.textSecondaryDark
                                : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_isConnected)
                    TextButton(
                      onPressed: _disconnect,
                      child: const Text('Disconnect',
                          style: TextStyle(color: AppColors.error)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Paper Size Preference
            const Text(
              'Paper Configuration',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isDark ? AppColors.cardDark : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: SegmentedButton<PaperSize>(
                segments: const [
                  ButtonSegment(
                    value: PaperSize.mm58,
                    label: Text('58 mm (2 inch)'),
                    icon: Icon(Icons.receipt_long, size: 16),
                  ),
                  ButtonSegment(
                    value: PaperSize.mm80,
                    label: Text('80 mm (3 inch)'),
                    icon: Icon(Icons.description, size: 16),
                  ),
                ],
                selected: {_paperSize},
                onSelectionChanged: (set) {
                  setState(() {
                    _paperSize = set.first;
                    BluetoothPrinterService.defaultPaperSize = _paperSize;
                  });
                },
              ),
            ),
            const SizedBox(height: 20),

            // Paired Devices List
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Paired Bluetooth Devices',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
                if (_isLoading)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
            const SizedBox(height: 8),

            if (_devices.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.cardDark : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color:
                        isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.bluetooth_searching,
                        size: 36, color: AppColors.textMutedLight),
                    const SizedBox(height: 10),
                    const Text(
                      'No Paired Bluetooth Printers Found',
                      style:
                          TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '1. Turn on your thermal printer\n2. Pair it in Android Bluetooth Settings\n3. Tap Refresh above',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark
                            ? AppColors.textSecondaryDark
                            : AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              ..._devices.map((d) {
                final isThisConnected = _isConnected && _connectedMac == d.macAdress;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: AppCard(
                    accentColor: isThisConnected ? AppColors.success : null,
                    hasAccentBorder: isThisConnected,
                    child: Row(
                      children: [
                        const Icon(Icons.bluetooth, color: AppColors.primary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                d.name.isNotEmpty ? d.name : 'Bluetooth Printer',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                d.macAdress,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark
                                      ? AppColors.textMutedDark
                                      : AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: isThisConnected
                              ? _disconnect
                              : () => _connect(d),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isThisConnected
                                ? AppColors.error
                                : AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                          ),
                          child: Text(
                            isThisConnected ? 'Disconnect' : 'Connect',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],

            const SizedBox(height: 24),

            // Test Print Action
            CustomButton(
              text: 'Print Test Slip',
              icon: Icons.print,
              backgroundColor: AppColors.primary,
              onPressed: _testPrint,
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
