/// Legal Services BLoC
///
/// Business logic and state management for the Legal Services module.
library legal_bloc;

import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/models/legal_models.dart';
import '../data/repositories/legal_repository.dart';

abstract class LegalEvent {}

class LoadDashboard extends LegalEvent {}
class LoadClients extends LegalEvent {
  final int page;
  final String? search;
  final String? status;
  LoadClients({this.page = 1, this.search, this.status});
}
class LoadCases extends LegalEvent {
  final int page;
  final String? search;
  final String? status;
  LoadCases({this.page = 1, this.search, this.status});
}
class CreateClient extends LegalEvent {
  final Map<String, dynamic> data;
  CreateClient(this.data);
}
class UpdateClient extends LegalEvent {
  final String id;
  final Map<String, dynamic> data;
  UpdateClient(this.id, this.data);
}
class DeleteClient extends LegalEvent {
  final String id;
  DeleteClient(this.id);
}
class CreateCase extends LegalEvent {
  final Map<String, dynamic> data;
  CreateCase(this.data);
}

abstract class LegalState {}

class LegalInitial extends LegalState {}
class LegalLoading extends LegalState {}
class LegalError extends LegalState {
  final String message;
  LegalError(this.message);
}

class DashboardLoaded extends LegalState {
  final LegalDashboardStats stats;
  DashboardLoaded(this.stats);
}

class ClientsLoaded extends LegalState {
  final List<LegalClient> clients;
  final PaginationInfo pagination;
  ClientsLoaded(this.clients, this.pagination);
}

class CasesLoaded extends LegalState {
  final List<LegalCase> cases;
  final PaginationInfo pagination;
  CasesLoaded(this.cases, this.pagination);
}

class ClientCreated extends LegalState {
  final LegalClient client;
  ClientCreated(this.client);
}

class ClientUpdated extends LegalState {
  final LegalClient client;
  ClientUpdated(this.client);
}

class ClientDeleted extends LegalState {}

class CaseCreated extends LegalState {
  final LegalCase legalCase;
  CaseCreated(this.legalCase);
}

class LegalBloc extends Bloc<LegalEvent, LegalState> {
  final LegalRepository repository;

  LegalBloc(this.repository) : super(LegalInitial()) {
    on<LoadDashboard>(_onLoadDashboard);
    on<LoadClients>(_onLoadClients);
    on<LoadCases>(_onLoadCases);
    on<CreateClient>(_onCreateClient);
    on<UpdateClient>(_onUpdateClient);
    on<DeleteClient>(_onDeleteClient);
    on<CreateCase>(_onCreateCase);
  }

  Future<void> _onLoadDashboard(LoadDashboard event, Emitter<LegalState> emit) async {
    emit(LegalLoading());
    try {
      final stats = await repository.getDashboardStats();
      emit(DashboardLoaded(stats));
    } catch (e) {
      emit(LegalError(e.toString()));
    }
  }

  Future<void> _onLoadClients(LoadClients event, Emitter<LegalState> emit) async {
    emit(LegalLoading());
    try {
      final result = await repository.getClients(
        page: event.page,
        search: event.search,
        status: event.status,
      );
      emit(ClientsLoaded(result.data, result.pagination));
    } catch (e) {
      emit(LegalError(e.toString()));
    }
  }

  Future<void> _onLoadCases(LoadCases event, Emitter<LegalState> emit) async {
    emit(LegalLoading());
    try {
      final result = await repository.getCases(
        page: event.page,
        search: event.search,
        status: event.status,
      );
      emit(CasesLoaded(result.data, result.pagination));
    } catch (e) {
      emit(LegalError(e.toString()));
    }
  }

  Future<void> _onCreateClient(CreateClient event, Emitter<LegalState> emit) async {
    emit(LegalLoading());
    try {
      final client = await repository.createClient(event.data);
      emit(ClientCreated(client));
    } catch (e) {
      emit(LegalError(e.toString()));
    }
  }

  Future<void> _onUpdateClient(UpdateClient event, Emitter<LegalState> emit) async {
    emit(LegalLoading());
    try {
      final client = await repository.updateClient(event.id, event.data);
      emit(ClientUpdated(client));
    } catch (e) {
      emit(LegalError(e.toString()));
    }
  }

  Future<void> _onDeleteClient(DeleteClient event, Emitter<LegalState> emit) async {
    emit(LegalLoading());
    try {
      await repository.deleteClient(event.id);
      emit(ClientDeleted());
    } catch (e) {
      emit(LegalError(e.toString()));
    }
  }

  Future<void> _onCreateCase(CreateCase event, Emitter<LegalState> emit) async {
    emit(LegalLoading());
    try {
      final legalCase = await repository.createCase(event.data);
      emit(CaseCreated(legalCase));
    } catch (e) {
      emit(LegalError(e.toString()));
    }
  }
}
