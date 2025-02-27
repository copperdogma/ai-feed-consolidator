import { http, HttpResponse, delay } from 'msw';
import { generateTestFeedXml } from '../utils/test-helpers';

// Pre-generate test content for better performance
const validRssXml = generateTestFeedXml([
  {
    title: 'Test Item 1',
    url: 'http://example.com/item1',
    guid: 'test-guid-1',
    description: 'Test Description 1',
    author: 'Test Author',
    published_at: new Date()
  },
  {
    title: 'Test Item 2',
    url: 'http://example.com/item2',
    guid: 'test-guid-2',
    description: 'Test Description 2',
    author: 'Test Author',
    published_at: new Date()
  }
]);

// Create response headers once
const xmlHeaders = new Headers({
  'Content-Type': 'application/xml'
});

export const handlers = [
  // Handle any RSS feed URL
  http.get('http://example.com/feed.xml', () => {
    return new HttpResponse(validRssXml, {
      headers: xmlHeaders
    });
  }),

  // Handle timeout test
  http.get('http://timeout.example.com/feed.xml', async () => {
    await delay(6000); // Longer than our 5s timeout
    return new HttpResponse('Request timed out', { status: 408 });
  }),

  // Handle nonexistent domain
  http.get('http://nonexistent.example.com/feed.xml', () => {
    return HttpResponse.error();
  }),

  // Handle Kijiji feeds
  http.get('https://www.kijiji.ca/*', () => {
    return new HttpResponse('Forbidden', { status: 403 });
  }),

  // Handle 404 errors
  http.get('*/404', () => {
    return new HttpResponse('Not Found', { status: 404 });
  }),

  // Handle 410 errors
  http.get('*/410', () => {
    return new HttpResponse('Gone', { status: 410 });
  }),

  // Handle empty feeds
  http.get('*/empty-feed', () => {
    return new HttpResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Empty Feed</title>
          <description>An empty feed</description>
        </channel>
      </rss>`,
      { headers: xmlHeaders }
    );
  }),

  // Handle invalid XML
  http.get('*/invalid-xml', () => {
    return new HttpResponse('This is not valid XML', {
      headers: xmlHeaders
    });
  }),

  // Handle empty responses
  http.get('*/empty-response', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Handle network errors
  http.get('*/network-error', () => {
    return HttpResponse.error();
  }),

  // Handle SSL errors
  http.get('*/ssl-error', () => {
    return new HttpResponse('SSL certificate error', { status: 525 });
  }),

  // Default handler for any other RSS feed URL
  http.get('*', () => {
    return new HttpResponse(validRssXml, {
      headers: xmlHeaders
    });
  })
]; 
