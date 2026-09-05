import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../providers/customer_provider.dart';

class CustomerFormScreen extends ConsumerStatefulWidget {
  const CustomerFormScreen({super.key});

  @override
  ConsumerState<CustomerFormScreen> createState() => _CustomerFormScreenState();
}

class _CustomerFormScreenState extends ConsumerState<CustomerFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _whatsappController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _styleController = TextEditingController();
  final _occasionController = TextEditingController();
  bool _isSaving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _whatsappController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _styleController.dispose();
    _occasionController.dispose();
    super.dispose();
  }

  Future<void> _saveCustomer() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final payload = {
      'name': _nameController.text.trim(),
      'mobile': _mobileController.text.trim(),
      'whatsapp': _whatsappController.text.trim().isNotEmpty
          ? _whatsappController.text.trim()
          : _mobileController.text.trim(),
      'address': _addressController.text.trim(),
      'city': _cityController.text.trim(),
      'preferredStyle': _styleController.text.trim(),
      'specialOccasion': _occasionController.text.trim(),
    };

    final ok = await ref.read(customersListProvider.notifier).createCustomer(payload);

    if (mounted) {
      setState(() => _isSaving = false);
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Customer registered successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to save customer. Mobile might already exist.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add New Customer'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            CustomTextField(
              controller: _nameController,
              label: 'Customer Full Name *',
              hint: 'e.g. Priyadarshini K',
              prefixIcon: const Icon(Icons.person_outline),
              validator: (val) {
                if (val == null || val.trim().isEmpty) return 'Customer name is required';
                return null;
              },
            ),
            const SizedBox(height: 16),
            CustomTextField(
              controller: _mobileController,
              label: 'Mobile Number *',
              hint: '10-digit mobile number',
              prefixIcon: const Icon(Icons.phone_outlined),
              keyboardType: TextInputType.phone,
              validator: (val) {
                if (val == null || val.trim().length < 10) return 'Valid 10-digit mobile is required';
                return null;
              },
            ),
            const SizedBox(height: 16),
            CustomTextField(
              controller: _whatsappController,
              label: 'WhatsApp Number (Optional)',
              hint: 'Leave blank to use mobile number',
              prefixIcon: const Icon(Icons.chat_outlined),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            CustomTextField(
              controller: _addressController,
              label: 'Address / Area',
              hint: 'Door no, street, locality',
              prefixIcon: const Icon(Icons.home_outlined),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            CustomTextField(
              controller: _cityController,
              label: 'City / Town',
              hint: 'e.g. Tirupur / Coimbatore / Chennai',
              prefixIcon: const Icon(Icons.location_city_outlined),
            ),
            const SizedBox(height: 16),
            CustomTextField(
              controller: _styleController,
              label: 'Preferred Style / Cut',
              hint: 'e.g. Princess cut, boat neck, designer blouse',
              prefixIcon: const Icon(Icons.style_outlined),
            ),
            const SizedBox(height: 16),
            CustomTextField(
              controller: _occasionController,
              label: 'Upcoming Special Occasion',
              hint: 'e.g. Wedding, Reception, Festival',
              prefixIcon: const Icon(Icons.celebration_outlined),
            ),
            const SizedBox(height: 32),
            CustomButton(
              text: 'Save Customer',
              isLoading: _isSaving,
              icon: Icons.check,
              onPressed: _saveCustomer,
            ),
          ],
        ),
      ),
    );
  }
}
