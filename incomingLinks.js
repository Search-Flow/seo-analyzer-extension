let incomingLinks = [];

async function crawlForIncomingLinks(currentUrl, domain) {
  const visited = new Set([currentUrl]);
  const toVisit = [];
  const maxPages = 30;
  incomingLinks = [];

  displayIncomingLinks('Crawling in progress...');

  const initialLinks = await extractLinksFromPage(currentUrl, domain);
  toVisit.push(...initialLinks.map(link => link.href));
  console.log(`Starting crawl from ${currentUrl} with ${initialLinks.length} initial links`);

  while (toVisit.length > 0 && visited.size < maxPages) {
    const url = toVisit.shift();
    if (visited.has(url)) continue;

    visited.add(url);
    console.log(`Visiting: ${url} (Visited: ${visited.size}/${maxPages})`);

    const links = await extractLinksFromPage(url, domain);
    links.forEach(link => {
      if (link.href === currentUrl) {
        incomingLinks.push({ url, anchorText: link.anchorText, imgSrc: link.imgSrc });
        console.log(`Found incoming link from ${url} with anchor text: ${link.anchorText}`);
      }
    });

    const newLinks = links
      .filter(link => !visited.has(link.href) && !toVisit.includes(link.href))
      .map(link => link.href);
    toVisit.push(...newLinks);
    console.log(`Added ${newLinks.length} new links to visit (Queue: ${toVisit.length})`);
  }

  displayIncomingLinks(incomingLinks.length ? null : `No incoming links found after crawling ${visited.size} pages.`);
  console.log(`Crawl complete. Found ${incomingLinks.length} incoming links.`);
}

async function extractLinksFromPage(url, domain) {
  try {
    const response = await fetch(url, { mode: 'cors' });
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
          const resolvedHref = href.startsWith('/') ? `${domain}${href}` : href;
          const img = a.querySelector('img');
          return {
            href: resolvedHref,
            anchorText: img ? 'Image' : (a.textContent.trim() || 'No text'),
            imgSrc: img ? img.src : null
          };
        } catch (e) {
          return null;
        }
      })
      .filter(link => link && link.href.startsWith(domain) && !link.href.includes('#'));
    return links;
  } catch (e) {
    console.log(`Error fetching ${url}: ${e.message}`);
    return [];
  }
}

function displayIncomingLinks(message) {
  const incomingLinksList = document.getElementById('incomingLinksList');
  if (message) {
    incomingLinksList.innerHTML = `<li>${message}</li>`;
  } else {
    // Sort links: those with anchor text (not "No text") first, "No text" at the end
    const sortedLinks = incomingLinks.sort((a, b) => {
      if (a.anchorText === 'No text' && b.anchorText !== 'No text') return 1;
      if (a.anchorText !== 'No text' && b.anchorText === 'No text') return -1;
      return 0;
    });

    incomingLinksList.innerHTML = sortedLinks.map(link => {
      if (link.imgSrc) {
        console.log(`Incoming Links Tab - Image Link Detected: ${link.imgSrc}`); // Debug log
        return `<li>Anchor Text: <span class="anchor-text image-anchor" data-img="${link.imgSrc}">${link.anchorText}</span><br>- <a href="${link.url}" target="_blank" class="link-url">${link.url}</a></li>`;
      } else {
        return `<li>Anchor Text: <span class="anchor-text">${link.anchorText}</span><br>- <a href="${link.url}" target="_blank" class="link-url">${link.url}</a></li>`;
      }
    }).join('');
  }

  // Add tooltip functionality for Incoming Links tab
  document.querySelectorAll('#incoming-links .image-anchor').forEach(anchor => {
    anchor.addEventListener('mouseenter', (e) => {
      const imgSrc = e.target.getAttribute('data-img');
      if (!imgSrc) {
        console.log('No imgSrc found for tooltip');
        return;
      }

      const tooltip = document.createElement('div');
      tooltip.className = 'image-tooltip';
      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = 'Image Link';
      img.className = 'tooltip-image';
      img.onerror = () => {
        console.log(`Failed to load image: ${imgSrc}`);
        tooltip.innerHTML = 'Image not accessible';
        tooltip.classList.add('tooltip-error');
      };
      tooltip.appendChild(img);
      document.body.appendChild(tooltip);

      const rect = e.target.getBoundingClientRect();
      tooltip.style.position = 'absolute';
      tooltip.style.top = `${rect.top - 110}px`; // Above the anchor text (100px image + 10px offset)
      tooltip.style.left = `${rect.left + (rect.width / 2) - 50}px`; // Centered (100px width / 2)
      tooltip.style.zIndex = '1000'; // Ensure tooltip is above other elements
    });

    anchor.addEventListener('mouseleave', () => {
      const tooltip = document.querySelector('.image-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    });
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const domain = new URL(tabs[0].url).origin;
  const currentUrl = tabs[0].url;
  crawlForIncomingLinks(currentUrl, domain);
});