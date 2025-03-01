import { http, HttpResponse, delay, RequestHandler } from 'msw';
import { setupServer } from 'msw/node';
import { logger } from '../../server/logger';
import { ErrorCategory } from '../../types/feed-types';
import { ErrorCategories } from '../../utils/error-categories';

// Pre-generate all test content
export const TEST_CONTENT = {
  validRss: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Test Feed</title><link>http://example.com</link><description>Test feed for unit tests</description><item><title>Test Item 1</title><link>http://example.com/1</link><guid>http://example.com/1</guid><description>Test description 1</description><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item></channel></rss>`,
  emptyRss: `<?xml version="1.0"?><rss version="2.0"><channel><title>Empty Feed</title><description>An empty feed</description></channel></rss>`,
  invalidXml: 'Not XML at all',
  invalidRss: `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`
};

// Pre-define headers
const XML_HEADERS = { 'Content-Type': 'application/xml' };

// Define handlers
export const handlers = [
  // API endpoints
  http.get('/api/feeds', async () => {
    await delay(100);
    return HttpResponse.json([
      {
        id: 1,
        url: 'https://example.com/feed.xml',
        title: 'Example Feed',
        description: 'An example feed for testing',
      },
    ]);
  }),
  
  http.post('/api/feeds', async ({ request }) => {
    await delay(100);
    const data = await request.json();
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...data,
    });
  }),

  // Valid feed
  http.get('http://example.com/feed.xml', () => {
    return new HttpResponse(TEST_CONTENT.validRss, {
      status: 200,
      headers: XML_HEADERS
    });
  }),

  // DNS error
  http.get('http://nonexistent.example.com/feed.xml', () => {
    const error = new Error('getaddrinfo ENOTFOUND nonexistent.example.com');
    (error as any).code = 'ENOTFOUND';
    (error as any).category = ErrorCategories.DNS_ERROR;
    return new HttpResponse(null, {
      status: 0,
      statusText: error.message,
      headers: {
        'x-error-code': 'ENOTFOUND',
        'x-error-category': ErrorCategories.DNS_ERROR
      }
    });
  }),

  // HTTP 404 error
  http.get('http://not-found.example.com/feed.xml', () => {
    return new HttpResponse(null, { status: 404, statusText: 'Not Found' });
  }),

  // Timeout test
  http.get('http://timeout.example.com/feed.xml', async () => {
    await delay(500); // Short delay for testing, was 11000ms
    return new HttpResponse(null, {
      status: 0,
      statusText: 'Request timed out',
      headers: {
        'x-error-code': 'ETIMEDOUT',
        'x-error-category': ErrorCategories.TIMEOUT
      }
    });
  }),

  // Invalid XML
  http.get('http://invalid-xml.example.com/feed.xml', () => {
    return new HttpResponse(TEST_CONTENT.invalidXml, { 
      status: 200,
      headers: XML_HEADERS 
    });
  }),

  // Invalid RSS
  http.get('http://invalid-rss.example.com/feed.xml', () => {
    return new HttpResponse(TEST_CONTENT.invalidRss, { 
      status: 200,
      headers: XML_HEADERS 
    });
  }),

  // Empty response
  http.get('http://empty-response.example.com/feed.xml', () => {
    return new HttpResponse('', { 
      status: 200,
      headers: XML_HEADERS 
    });
  }),

  // Empty feed
  http.get('http://empty-feed.example.com/feed.xml', () => {
    return new HttpResponse(TEST_CONTENT.emptyRss, { 
      status: 200,
      headers: XML_HEADERS 
    });
  }),

  // Network error
  http.get('http://network-error.example.com/feed.xml', () => {
    const error = new Error('connect ECONNREFUSED');
    (error as any).code = 'ECONNREFUSED';
    (error as any).category = ErrorCategories.NETWORK_ERROR;
    return new HttpResponse(null, {
      status: 0,
      statusText: error.message,
      headers: {
        'x-error-code': 'ECONNREFUSED',
        'x-error-category': ErrorCategories.NETWORK_ERROR
      }
    });
  }),

  // SSL error
  http.get('https://expired-cert.example.com/feed.xml', () => {
    const error = new Error('unable to verify the first certificate');
    (error as any).code = 'CERT_HAS_EXPIRED';
    (error as any).category = ErrorCategories.SSL_ERROR;
    return new HttpResponse(null, {
      status: 0,
      statusText: error.message,
      headers: {
        'x-error-code': 'CERT_HAS_EXPIRED',
        'x-error-category': ErrorCategories.SSL_ERROR
      }
    });
  }),

  // Auth endpoints
  http.post('/test/login', async () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.get('/protected', async () => {
    return new HttpResponse(null, { status: 401 });
  })
] satisfies RequestHandler[];

// Create the server
export const server = setupServer(...handlers);

// Start the server
export const setupMockServer = () => {
  try {
    server.listen({ onUnhandledRequest: 'warn' });
    logger.info('MSW Server started');
  } catch (error) {
    logger.error('Failed to start MSW Server:', error);
  }
};

// Reset handlers
export const resetMockServer = () => {
  server.resetHandlers();
};

// Stop server
export const cleanupMockServer = () => {
  server.close();
  logger.info('MSW Server stopped');
};
