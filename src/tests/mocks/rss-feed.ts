export const mockXmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>Test Description</description>
    <link>http://example.com</link>
    <item>
      <title>Test Item 1</title>
      <description>Test Description 1</description>
      <link>http://example.com/item1</link>
      <guid>http://example.com/item1</guid>
      <pubDate>Tue, 05 Feb 2024 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Test Item 2</title>
      <description>Test Description 2</description>
      <link>http://example.com/item2</link>
      <guid>http://example.com/item2</guid>
      <pubDate>Tue, 05 Feb 2024 13:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

export const mockInvalidXmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Invalid Feed</title>
    <description>Invalid Description</description>
    <link>http://example.com</link>
    <item>
      <title>Invalid Item</title>
      <description>Invalid Description</description>
      <link>http://example.com/invalid</link>
      <guid>http://example.com/invalid</guid>
      <pubDate>Invalid Date</pubDate>
    </item>
  </channel>
</rss`;

export const mockEmptyFeedResponse = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
    <description>Empty Description</description>
    <link>http://example.com</link>
  </channel>
</rss>`;

export const mockKijijiFeedResponse = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Kijiji Feed</title>
    <description>Test Kijiji Feed</description>
    <link>http://kijiji.ca/feed</link>
    <item>
      <title>Test Car</title>
      <description>Test Description</description>
      <link>https://www.kijiji.ca/v-cars-trucks/calgary/test-car/1234567890</link>
      <guid>https://www.kijiji.ca/v-cars-trucks/calgary/test-car/1234567890</guid>
      <pubDate>Tue, 05 Feb 2024 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`; 