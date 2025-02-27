import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';

// Pre-generate all test content
const TEST_CONTENT = {
  validRss: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Test Feed</title><link>http://example.com</link><description>Test feed for unit tests</description><item><title>Test Item 1</title><link>http://example.com/1</link><guid>http://example.com/1</guid><description>Test description 1</description><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item></channel></rss>`,
  emptyRss: `<?xml version="1.0"?><rss version="2.0"><channel><title>Empty Feed</title><description>An empty feed</description></channel></rss>`,
  invalidXml: 'Not XML at all',
  invalidRss: `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`
};

// Pre-define headers
const XML_HEADERS = { 'Content-Type': 'application/xml' };

// Create optimized request handlers
export const handlers = [
  // Valid feed
  http.get('http://example.com/feed.xml', () => {
    return new HttpResponse(TEST_CONTENT.validRss, {
      headers: XML_HEADERS
    });
  }),

  // DNS error
  http.get('http://nonexistent.example.com/feed.xml', () => {
    const error = new TypeError('getaddrinfo ENOTFOUND nonexistent.example.com');
    error.cause = { code: 'ENOTFOUND' };
    throw error;
  }),

  // HTTP 404 error
  http.get('http://not-found.example.com/feed.xml', () => {
    return new HttpResponse(null, { 
      status: 404,
      statusText: 'Not Found'
    });
  }),

  // Timeout test
  http.get('http://timeout.example.com/feed.xml', async () => {
    await delay('infinite');
    return new HttpResponse(null);
  }),

  // Empty response
  http.get('http://empty-response.example.com/feed.xml', () => {
    return new HttpResponse('', { 
      status: 200,
      headers: XML_HEADERS 
    });
  }),

  // Invalid XML
  http.get('http://invalid-xml.example.com/feed.xml', () => {
    return new HttpResponse('Not valid XML content', { 
      status: 200,
      headers: XML_HEADERS 
    });
  }),

  // Invalid RSS (missing required elements)
  http.get('http://invalid-rss.example.com/feed.xml', () => {
    return new HttpResponse(TEST_CONTENT.invalidRss, { 
      status: 200,
      headers: XML_HEADERS 
    });
  }),

  // Network error
  http.get('http://network-error.example.com/feed.xml', () => {
    const error = new TypeError('Failed to fetch');
    error.cause = { type: 'system' };
    throw error;
  }),

  // SSL error
  http.get('http://ssl-error.example.com/feed.xml', () => {
    const error = new TypeError('unable to verify the first certificate');
    error.cause = { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' };
    throw error;
  })
];

// Server instance
const server = setupServer(...handlers);

export { server }; 