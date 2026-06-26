import { describe, it, expect } from 'vitest';
import { cn, getJwtTTL, generateTitleFromHostname } from '@/lib/utils';

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });

    it('should handle conflicting Tailwind classes', () => {
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    it('should handle conditional classes with clsx', () => {
      expect(cn('base-class', false, 'visible')).toBe('base-class visible');
    });

    it('should handle undefined and null', () => {
      expect(cn('text-sm', undefined, null, 'font-bold')).toBe('text-sm font-bold');
    });
  });

  describe('getJwtTTL', () => {
    it('should extract TTL from valid JWT token', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iat: now,
        exp: now + 3600, // 1 hour from now
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      expect(getJwtTTL(mockToken)).toBe('1 hours 0 minutes');
    });

    it('should handle days in TTL', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iat: now,
        exp: now + 86400 * 2 + 3600 * 3 + 60 * 30,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      expect(getJwtTTL(mockToken)).toBe('2 days 3 hours 30 minutes');
    });

    it('should handle minutes only', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iat: now,
        exp: now + 60 * 45,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      expect(getJwtTTL(mockToken)).toBe('45 minutes');
    });

    it('should return null for invalid token', () => {
      expect(getJwtTTL('invalid.token')).toBeNull();
    });

    it('should return null for token without iat/exp', () => {
      const payload = { sub: '123' };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      expect(getJwtTTL(mockToken)).toBeNull();
    });
  });

  describe('generateTitleFromHostname', () => {
    it('should extract domain name from hostname', () => {
      expect(generateTitleFromHostname('example.com')).toBe('Example');
    });

    it('should remove www prefix', () => {
      expect(generateTitleFromHostname('www.example.com')).toBe('Example');
    });

    it('should handle subdomains', () => {
      expect(generateTitleFromHostname('blog.example.com')).toBe('Blog');
    });

    it('should handle port numbers', () => {
      expect(generateTitleFromHostname('example.com:8080')).toBe('Example');
    });

    it('should handle IPv4 addresses', () => {
      expect(generateTitleFromHostname('192.168.1.1')).toBe('192.168.1.1');
    });

    it('should handle IPv4 addresses with port', () => {
      expect(generateTitleFromHostname('192.168.1.1:8080')).toBe('192.168.1.1');
    });

    it('should handle bracketed IPv6 addresses', () => {
      expect(generateTitleFromHostname('[2001:db8::1]:8080')).toBe('2001:db8::1');
    });

    it('should handle bare IPv6 addresses', () => {
      expect(generateTitleFromHostname('2001:db8::1')).toBe('2001:db8::1');
    });

    it('should handle hyphens in domain names', () => {
      expect(generateTitleFromHostname('my-awesome-site.com')).toBe('My Awesome Site');
    });

    it('should handle underscores in domain names', () => {
      expect(generateTitleFromHostname('my_site.com')).toBe('My Site');
    });

    it('should handle camelCase', () => {
      expect(generateTitleFromHostname('myAwesomeSite.com')).toBe('My Awesome Site');
    });

    it('should handle complex subdomains', () => {
      expect(generateTitleFromHostname('api.staging.example.co.uk')).toBe('Api Staging Example');
    });

    it('should return hostname if no meaningful segments', () => {
      expect(generateTitleFromHostname('localhost')).toBe('Localhost');
    });
  });
});



