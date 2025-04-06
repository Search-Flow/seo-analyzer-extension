let crawlResults = {};
let crawlStatus = {};

console.log("Background script loaded");

// Start crawling when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked, starting crawl for tab:", tab.url);
  const currentUrl = tab.url;
  const domain = new URL(currentUrl).origin;
  startCrawl(currentUrl, domain);
});

// Listen for tab updates (e.g., URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    console.log("Tab updated, starting crawl for URL:", changeInfo.url);
    const currentUrl = changeInfo.url;
    const domain = new URL(currentUrl).origin;
    startCrawl(currentUrl, domain);
  }
});

// Handle messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getCrawlData') {
    const currentUrl = message.currentUrl;
    console.log(`Popup requested crawl data for ${currentUrl}. Status: ${crawlStatus[currentUrl] || 'idle'}`);
    sendResponse({
      status: crawlStatus[currentUrl] || 'idle',
      incomingLinks: crawlResults[currentUrl] || []
    });
  }
});

async function startCrawl(currentUrl, domain) {
  if (crawlStatus[currentUrl] === 'crawling') {
    console.log(`Crawl already in progress for ${currentUrl}`);
    return;
  }

  console.log(`Starting crawl for ${currentUrl}`);
  crawlStatus[currentUrl] = 'crawling';
  const incomingLinks = await crawlForIncomingLinks(currentUrl, domain);
  crawlResults[currentUrl] = incomingLinks;
  crawlStatus[currentUrl] = 'complete';
  console.log(`Crawl completed for ${currentUrl}. Found ${incomingLinks.length} incoming links.`);
}

async function crawlForIncomingLinks(currentUrl, domain) {
  const visited = new Set([currentUrl]);
  const toVisit = [];
  const maxPages = 50;
  const batchSize = 10; // Increased batch size for faster crawling
  const incomingLinks = [];

  // Start with the homepage and current page
  toVisit.push(domain, currentUrl);

  while (toVisit.length > 0 && visited.size < maxPages) {
    const batch = toVisit.splice(0, batchSize);
    const promises = batch.map(async url => {
      if (visited.has(url)) return { url, links: [] };

      visited.add(url);
      console.log(`Visiting: ${url} (Visited: ${visited.size}/${maxPages})`);

      const links = await extractLinksFromPage(url, domain);
      const foundLink = links.includes(currentUrl);
      if (foundLink) {
        console.log(`Found incoming link from ${url}`);
      }
      return { url, links, foundLink };
    });

    const results = await Promise.allSettled(promises);
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { url, links, foundLink } = result.value;
        if (foundLink) {
          incomingLinks.push(url);
        }
        const newLinks = links.filter(link => !visited.has(link) && !toVisit.includes(link));
        toVisit.push(...newLinks);
        console.log(`Added ${newLinks.length} new links to visit (Queue: ${toVisit.length})`);
      }
    });
  }

  return incomingLinks;
}

async function extractLinksFromPage(url, domain) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
      return [];
    }
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'))
      .map(a => {
        try {
          const href = a.href;
          return href.startsWith('/') ? `${domain}${href}` : href;
        } catch (e) {
          return null;
        }
      })
      .filter(href => href && href.startsWith(domain) && !href.includes('#'));
    return [...new Set(links)];
  } catch (e) {
    console.log(`Error fetching ${url}: ${e.message}`);
    return [];
  }
}