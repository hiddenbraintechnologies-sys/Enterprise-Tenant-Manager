class PaginationParams {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? sortBy;
  final String sortOrder;
  final Map<String, String>? additionalFilters;

  PaginationParams({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.sortBy,
    this.sortOrder = 'desc',
    this.additionalFilters,
  });

  Map<String, dynamic> toQueryParameters() {
    final params = <String, dynamic>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    
    if (search != null && search!.isNotEmpty) {
      params['search'] = search;
    }
    if (status != null && status!.isNotEmpty) {
      params['status'] = status;
    }
    if (sortBy != null && sortBy!.isNotEmpty) {
      params['sortBy'] = sortBy;
      params['sortOrder'] = sortOrder;
    }
    if (additionalFilters != null) {
      params.addAll(additionalFilters!);
    }
    
    return params;
  }

  PaginationParams copyWith({
    int? page,
    int? limit,
    String? search,
    String? status,
    String? sortBy,
    String? sortOrder,
    Map<String, String>? additionalFilters,
  }) {
    return PaginationParams(
      page: page ?? this.page,
      limit: limit ?? this.limit,
      search: search ?? this.search,
      status: status ?? this.status,
      sortBy: sortBy ?? this.sortBy,
      sortOrder: sortOrder ?? this.sortOrder,
      additionalFilters: additionalFilters ?? this.additionalFilters,
    );
  }
}

class PaginatedResponse<T> {
  final List<T> data;
  final PaginationMeta pagination;

  PaginatedResponse({
    required this.data,
    required this.pagination,
  });

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    return PaginatedResponse(
      data: (json['data'] as List<dynamic>)
          .map((e) => fromJsonT(e as Map<String, dynamic>))
          .toList(),
      pagination: PaginationMeta.fromJson(json['pagination']),
    );
  }

  bool get hasNext => pagination.hasNext;
  bool get hasPrev => pagination.hasPrev;
  int get totalPages => pagination.totalPages;
  int get total => pagination.total;
}

class PaginationMeta {
  final int page;
  final int limit;
  final int total;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;

  PaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      page: json['page'] ?? 1,
      limit: json['limit'] ?? 20,
      total: json['total'] ?? 0,
      totalPages: json['totalPages'] ?? 0,
      hasNext: json['hasNext'] ?? false,
      hasPrev: json['hasPrev'] ?? false,
    );
  }
}
