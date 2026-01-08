import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/employee_bloc.dart';
import '../data/models/hr_models.dart';

class AddEditEmployeePage extends StatefulWidget {
  final String? employeeId;
  final HrEmployee? employee;

  const AddEditEmployeePage({super.key, this.employeeId, this.employee});

  bool get isEditing => employeeId != null || employee != null;

  @override
  State<AddEditEmployeePage> createState() => _AddEditEmployeePageState();
}

class _AddEditEmployeePageState extends State<AddEditEmployeePage> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _positionController = TextEditingController();
  
  String _employmentType = 'full_time';
  String _status = 'active';
  String? _selectedDepartmentId;
  DateTime? _dateOfJoining;
  List<HrDepartment> _departments = [];

  @override
  void initState() {
    super.initState();
    _loadDepartments();
    if (widget.employee != null) {
      _populateForm(widget.employee!);
    }
  }

  void _loadDepartments() {
    final state = context.read<EmployeeBloc>().state;
    if (state is EmployeeLoaded) {
      setState(() => _departments = state.departments);
    }
  }

  void _populateForm(HrEmployee employee) {
    _firstNameController.text = employee.firstName;
    _lastNameController.text = employee.lastName;
    _emailController.text = employee.email ?? '';
    _phoneController.text = employee.phone ?? '';
    _positionController.text = employee.position ?? '';
    _employmentType = employee.employmentType;
    _status = employee.status;
    _selectedDepartmentId = employee.departmentId;
    if (employee.dateOfJoining != null) {
      _dateOfJoining = DateTime.tryParse(employee.dateOfJoining!);
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _positionController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final data = {
      'firstName': _firstNameController.text.trim(),
      'lastName': _lastNameController.text.trim(),
      if (_emailController.text.trim().isNotEmpty) 'email': _emailController.text.trim(),
      if (_phoneController.text.trim().isNotEmpty) 'phone': _phoneController.text.trim(),
      if (_positionController.text.trim().isNotEmpty) 'position': _positionController.text.trim(),
      if (_selectedDepartmentId != null) 'departmentId': _selectedDepartmentId,
      'employmentType': _employmentType,
      'status': _status,
      if (_dateOfJoining != null) 'dateOfJoining': _dateOfJoining!.toIso8601String().split('T')[0],
    };

    final employeeId = widget.employeeId ?? widget.employee?.id;
    if (widget.isEditing && employeeId != null) {
      context.read<EmployeeBloc>().add(UpdateEmployee(employeeId, data));
    } else {
      context.read<EmployeeBloc>().add(CreateEmployee(data));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Edit Employee' : 'Add Employee'),
        actions: [
          if (widget.isEditing)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: _showDeleteConfirmation,
            ),
        ],
      ),
      body: BlocListener<EmployeeBloc, EmployeeState>(
        listener: (context, state) {
          if (state is EmployeeActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.green),
            );
            Navigator.pop(context, true);
          } else if (state is EmployeeError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildSectionTitle('Personal Information'),
                const SizedBox(height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _firstNameController,
                        decoration: const InputDecoration(
                          labelText: 'First Name *',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.person),
                        ),
                        textCapitalization: TextCapitalization.words,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'First name is required';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _lastNameController,
                        decoration: const InputDecoration(
                          labelText: 'Last Name *',
                          border: OutlineInputBorder(),
                        ),
                        textCapitalization: TextCapitalization.words,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Last name is required';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.email),
                    hintText: 'employee@company.com',
                  ),
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value != null && value.isNotEmpty) {
                      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                        return 'Enter a valid email address';
                      }
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.phone),
                    hintText: '+1 234 567 8900',
                  ),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 24),
                _buildSectionTitle('Employment Details'),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _positionController,
                  decoration: const InputDecoration(
                    labelText: 'Position / Job Title',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.work),
                    hintText: 'e.g. Software Engineer',
                  ),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedDepartmentId,
                  decoration: const InputDecoration(
                    labelText: 'Department',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.business),
                  ),
                  hint: const Text('Select Department'),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('No Department')),
                    ..._departments.map((d) => DropdownMenuItem(
                          value: d.id,
                          child: Text(d.name),
                        )),
                  ],
                  onChanged: (value) {
                    setState(() => _selectedDepartmentId = value);
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _employmentType,
                  decoration: const InputDecoration(
                    labelText: 'Employment Type *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.badge),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'full_time', child: Text('Full Time')),
                    DropdownMenuItem(value: 'part_time', child: Text('Part Time')),
                    DropdownMenuItem(value: 'contract', child: Text('Contract')),
                    DropdownMenuItem(value: 'intern', child: Text('Intern')),
                    DropdownMenuItem(value: 'freelance', child: Text('Freelance')),
                  ],
                  onChanged: (value) {
                    setState(() => _employmentType = value ?? 'full_time');
                  },
                ),
                const SizedBox(height: 16),
                InkWell(
                  onTap: _selectJoiningDate,
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Date of Joining',
                      border: const OutlineInputBorder(),
                      prefixIcon: const Icon(Icons.calendar_today),
                      suffixIcon: _dateOfJoining != null
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () => setState(() => _dateOfJoining = null),
                            )
                          : null,
                    ),
                    child: Text(
                      _dateOfJoining != null
                          ? '${_dateOfJoining!.day}/${_dateOfJoining!.month}/${_dateOfJoining!.year}'
                          : 'Select date',
                      style: TextStyle(
                        color: _dateOfJoining != null
                            ? Theme.of(context).textTheme.bodyLarge?.color
                            : Theme.of(context).hintColor,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _status,
                  decoration: const InputDecoration(
                    labelText: 'Status *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.toggle_on),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'active', child: Text('Active')),
                    DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
                    DropdownMenuItem(value: 'on_leave', child: Text('On Leave')),
                    DropdownMenuItem(value: 'terminated', child: Text('Terminated')),
                  ],
                  onChanged: (value) {
                    setState(() => _status = value ?? 'active');
                  },
                ),
                const SizedBox(height: 32),
                BlocBuilder<EmployeeBloc, EmployeeState>(
                  builder: (context, state) {
                    final isSubmitting = state is EmployeeLoading;
                    return FilledButton.icon(
                      onPressed: isSubmitting ? null : _submit,
                      icon: isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.save),
                      label: Text(widget.isEditing ? 'Update Employee' : 'Add Employee'),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('Cancel'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 20,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
      ],
    );
  }

  Future<void> _selectJoiningDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _dateOfJoining ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) {
      setState(() => _dateOfJoining = date);
    }
  }

  void _showDeleteConfirmation() {
    final employeeId = widget.employeeId ?? widget.employee?.id;
    if (employeeId == null) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Employee'),
        content: const Text('Are you sure you want to delete this employee? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<EmployeeBloc>().add(DeleteEmployee(employeeId));
              Navigator.pop(context, true);
            },
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
