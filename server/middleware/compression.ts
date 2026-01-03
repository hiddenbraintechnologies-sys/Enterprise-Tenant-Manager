/**
 * HTTP Compression Middleware
 * 
 * Lightweight compression for API responses.
 * Uses native zlib for gzip compression.
 */

import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

interface CompressionOptions {
  threshold?: number;  // Minimum size to compress (bytes)
  level?: number;      // Compression level (1-9)
}

const defaultOptions: CompressionOptions = {
  threshold: 1024,  // 1KB minimum
  level: 6,         // Good balance of speed and compression
};

/**
 * Check if response should be compressed
 */
function shouldCompress(req: Request, res: Response): boolean {
  // Skip if no-compression header is set
  if (req.headers['x-no-compression']) {
    return false;
  }

  // Skip if already encoded
  if (res.getHeader('Content-Encoding')) {
    return false;
  }

  // Check Accept-Encoding header
  const acceptEncoding = req.headers['accept-encoding'] || '';
  return acceptEncoding.includes('gzip') || acceptEncoding.includes('deflate');
}

/**
 * Check if content type is compressible
 */
function isCompressible(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const type = contentType.toLowerCase();
  return (
    type.includes('text/') ||
    type.includes('application/json') ||
    type.includes('application/javascript') ||
    type.includes('application/xml') ||
    type.includes('image/svg+xml')
  );
}

/**
 * Compression middleware
 * 
 * Note: This is a simplified implementation. For production,
 * consider using the 'compression' npm package which handles
 * edge cases better.
 */
export function compressionMiddleware(options: CompressionOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // Only compress if client accepts encoding
    if (!shouldCompress(req, res)) {
      return next();
    }

    // Store original json method for API responses
    const originalJson = res.json.bind(res);
    
    res.json = function(body: any): Response {
      // Check if headers already sent
      if (res.headersSent) {
        return originalJson(body);
      }

      const json = JSON.stringify(body);
      const buffer = Buffer.from(json, 'utf-8');
      
      // Only compress if above threshold
      if (buffer.length < (opts.threshold || 0)) {
        return originalJson(body);
      }

      const acceptEncoding = req.headers['accept-encoding'] || '';
      
      try {
        if (acceptEncoding.includes('gzip')) {
          const compressed = zlib.gzipSync(buffer, { level: opts.level });
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', compressed.length);
          res.setHeader('Vary', 'Accept-Encoding');
          return res.send(compressed);
        }
      } catch {
        // Fallback to uncompressed on error
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Simple filter to exclude certain paths from compression
 */
export function excludePaths(paths: string[]): (req: Request) => boolean {
  return (req: Request) => {
    return !paths.some(path => req.path.startsWith(path));
  };
}
