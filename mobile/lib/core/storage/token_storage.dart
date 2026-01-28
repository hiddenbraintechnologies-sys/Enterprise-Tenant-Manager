import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'secure_storage.dart';

abstract class TokenStorage {
  Future<void> saveTokens({required String accessToken, required String refreshToken});
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<void> clearTokens();
  Future<bool> hasValidTokens();
  Future<Map<String, dynamic>?> decodeAccessToken();
}

class TokenStorageImpl implements TokenStorage {
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';

  final SecureStorage _storage;

  TokenStorageImpl(this._storage);

  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[TokenStorage] $message');
    }
  }

  @override
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _debugLog('Saving tokens - access: ${accessToken.length} chars, refresh: ${refreshToken.length} chars');
    await Future.wait([
      _storage.write(_accessTokenKey, accessToken),
      _storage.write(_refreshTokenKey, refreshToken),
    ]);
    
    // Verify tokens were saved
    final savedAccess = await _storage.read(_accessTokenKey);
    final savedRefresh = await _storage.read(_refreshTokenKey);
    _debugLog('Tokens saved - verify access: ${savedAccess != null}, refresh: ${savedRefresh != null}');
  }

  @override
  Future<String?> getAccessToken() async {
    return await _storage.read(_accessTokenKey);
  }

  @override
  Future<String?> getRefreshToken() async {
    return await _storage.read(_refreshTokenKey);
  }

  @override
  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(_accessTokenKey),
      _storage.delete(_refreshTokenKey),
    ]);
  }

  @override
  Future<bool> hasValidTokens() async {
    final accessToken = await getAccessToken();
    if (accessToken == null) return false;

    final payload = await decodeAccessToken();
    if (payload == null) return false;

    final exp = payload['exp'] as int?;
    if (exp == null) return false;

    final expiryDate = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
    return expiryDate.isAfter(DateTime.now());
  }

  @override
  Future<Map<String, dynamic>?> decodeAccessToken() async {
    final token = await getAccessToken();
    if (token == null) return null;

    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;

      final payload = parts[1];
      final normalized = base64Url.normalize(payload);
      final decoded = utf8.decode(base64Url.decode(normalized));
      return json.decode(decoded) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }
}
