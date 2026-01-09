import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/clinic_bloc.dart';
import '../bloc/clinic_event.dart';
import '../bloc/clinic_state.dart';
import '../../domain/entities/clinic_patient.dart';
import '../../domain/entities/clinic_appointment.dart';

class PatientDetailPage extends StatefulWidget {
  final String patientId;

  const PatientDetailPage({super.key, required this.patientId});

  @override
  State<PatientDetailPage> createState() => _PatientDetailPageState();
}

class _PatientDetailPageState extends State<PatientDetailPage> {
  @override
  void initState() {
    super.initState();
    context.read<ClinicBloc>().add(LoadPatientDetail(widget.patientId));
    context.read<ClinicBloc>().add(LoadAppointments(patientId: widget.patientId));
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ClinicBloc, ClinicState>(
      builder: (context, state) {
        final patient = state.selectedPatient;

        if (patient == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Patient Details')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(patient.name),
            actions: [
              IconButton(
                icon: const Icon(Icons.edit),
                onPressed: () => _showEditDialog(context, patient),
              ),
              PopupMenuButton<String>(
                onSelected: (value) {
                  if (value == 'delete') {
                    _showDeleteConfirmation(context, patient);
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Delete', style: TextStyle(color: Colors.red)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildPatientHeader(patient),
                const SizedBox(height: 24),
                _buildInfoSection(patient),
                const SizedBox(height: 24),
                _buildMedicalHistory(patient),
                const SizedBox(height: 24),
                _buildAppointmentsSection(state),
              ],
            ),
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _bookAppointment(context, patient),
            icon: const Icon(Icons.add),
            label: const Text('Book Appointment'),
          ),
        );
      },
    );
  }

  Widget _buildPatientHeader(ClinicPatient patient) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: Colors.blue.withOpacity(0.2),
              child: Text(
                patient.name.isNotEmpty ? patient.name[0].toUpperCase() : 'P',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    patient.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (patient.phone != null)
                    Row(
                      children: [
                        const Icon(Icons.phone, size: 16, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(patient.phone!),
                      ],
                    ),
                  if (patient.email != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.email, size: 16, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(patient.email!),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoSection(ClinicPatient patient) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Patient Information',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const Divider(),
            _buildInfoRow('Gender', patient.gender ?? 'Not specified'),
            _buildInfoRow('Blood Group', patient.bloodGroup ?? 'Not specified'),
            _buildInfoRow(
              'Date of Birth',
              patient.dateOfBirth != null
                  ? '${patient.dateOfBirth!.day}/${patient.dateOfBirth!.month}/${patient.dateOfBirth!.year}'
                  : 'Not specified',
            ),
            _buildInfoRow('Address', patient.address ?? 'Not specified'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(color: Colors.grey),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMedicalHistory(ClinicPatient patient) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Medical History',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.add, size: 20),
                  onPressed: () => _addMedicalHistory(context, patient),
                ),
              ],
            ),
            const Divider(),
            if (patient.medicalHistory == null || patient.medicalHistory!.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text(
                    'No medical history recorded',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ),
              )
            else
              ...patient.medicalHistory!.map((history) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        const Icon(Icons.circle, size: 8, color: Colors.blue),
                        const SizedBox(width: 8),
                        Expanded(child: Text(history)),
                      ],
                    ),
                  )),
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentsSection(ClinicState state) {
    final appointments = state.appointments
        .where((a) => a.patientId == widget.patientId)
        .toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Appointments',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const Divider(),
            if (state.appointmentsStatus == ClinicStatus.loading)
              const Center(child: CircularProgressIndicator())
            else if (appointments.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text(
                    'No appointments found',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ),
              )
            else
              ...appointments.take(5).map((appointment) => _buildAppointmentTile(appointment)),
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentTile(ClinicAppointment appointment) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: _getStatusColor(appointment.status).withOpacity(0.2),
        child: Icon(
          Icons.schedule,
          color: _getStatusColor(appointment.status),
          size: 20,
        ),
      ),
      title: Text(
        '${_formatDate(appointment.dateTime)} at ${_formatTime(appointment.dateTime)}',
      ),
      subtitle: Text('Dr. ${appointment.doctorName ?? 'Unknown'}'),
      trailing: Chip(
        label: Text(
          appointment.statusString,
          style: const TextStyle(fontSize: 10),
        ),
        backgroundColor: _getStatusColor(appointment.status).withOpacity(0.2),
      ),
    );
  }

  Color _getStatusColor(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.scheduled:
        return Colors.blue;
      case AppointmentStatus.completed:
        return Colors.green;
      case AppointmentStatus.cancelled:
        return Colors.red;
    }
  }

  String _formatDate(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }

  String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour;
    final minute = dateTime.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$displayHour:$minute $period';
  }

  void _showEditDialog(BuildContext context, ClinicPatient patient) {
    Navigator.pushNamed(context, '/clinic/patients/${patient.id}/edit');
  }

  void _showDeleteConfirmation(BuildContext context, ClinicPatient patient) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Patient'),
        content: Text('Are you sure you want to delete ${patient.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<ClinicBloc>().add(DeletePatient(patient.id));
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _bookAppointment(BuildContext context, ClinicPatient patient) {
    Navigator.pushNamed(
      context,
      '/clinic/appointments/new',
      arguments: {'patientId': patient.id},
    );
  }

  void _addMedicalHistory(BuildContext context, ClinicPatient patient) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Medical History'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Enter medical condition or note',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                final updatedHistory = [
                  ...?patient.medicalHistory,
                  controller.text,
                ];
                context.read<ClinicBloc>().add(UpdatePatient(
                      patient.id,
                      {'medicalHistory': updatedHistory},
                    ));
                Navigator.pop(context);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}
