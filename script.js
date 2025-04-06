function extractPageData() {
  try {
    const title = document.title || 'Not found';
    const metaDesc = document.querySelector('meta[name="description"]')?.content || 'Not found';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => ({ tag: h.tagName, text: h.textContent.trim() || 'Empty' }));
    const links = Array.from(document.querySelectorAll('a'))
      .map(a => {
        const img = a.querySelector('img');
        return {
          href: a.href || '#',
          text: img ? 'Image' : (a.textContent.trim() || 'No text'),
          imgSrc: img ? img.src : null,
          nofollow: a.rel.includes('nofollow')
        };
      });
    const pageUrl = window.location.href;
    const canonical = document.querySelector('link[rel="canonical"]')?.href || 'Not found';
    const metaRobots = document.querySelector('meta[name="robots"]')?.content || 'Not found';
    const images = Array.from(document.querySelectorAll('img')).length;

    // Count headings by type
    const headingCounts = {
      h1: headings.filter(h => h.tag === 'H1').length,
      h2: headings.filter(h => h.tag === 'H2').length,
      h3: headings.filter(h => h.tag === 'H3').length,
      h4: headings.filter(h => h.tag === 'H4').length,
      h5: headings.filter(h => h.tag === 'H5').length,
      h6: headings.filter(h => h.tag === 'H6').length
    };

    return { 
      title, 
      metaDesc, 
      headings, 
      links, 
      pageUrl,
      canonical, 
      metaRobots, 
      images, 
      headingCounts 
    };
  } catch (e) {
    return { error: 'Failed to extract data: ' + e.message };
  }
}

function displayData(data) {
  if (data.error) {
    document.getElementById('title').textContent = data.error;
    document.getElementById('metaDesc').textContent = '';
    document.getElementById('pageUrl').textContent = '';
    document.getElementById('canonical').textContent = '';
    document.getElementById('metaRobots').textContent = '';
    document.getElementById('title-status').classList.add('status-not-found');
    document.getElementById('metaDesc-status').classList.add('status-not-found');
    document.getElementById('canonical-status').classList.add('status-not-found');
    document.getElementById('metaRobots-status').classList.add('status-not-found');
    document.getElementById('title-char-count').textContent = '0 characters';
    document.getElementById('metaDesc-char-count').textContent = '0 characters';
    document.getElementById('h1-count').textContent = '0';
    document.getElementById('h2-count').textContent = '0';
    document.getElementById('h3-count').textContent = '0';
    document.getElementById('h4-count').textContent = '0';
    document.getElementById('h5-count').textContent = '0';
    document.getElementById('h6-count').textContent = '0';
    document.getElementById('links-count').textContent = '0';
    document.getElementById('images-count').textContent = '0';
    document.getElementById('headingsList').innerHTML = '<li class="error">Error loading headings</li>';
    document.getElementById('linksList').innerHTML = '<li class="error">Error loading links</li>';
    return;
  }

  // Title
  document.getElementById('title').textContent = data.title;
  const titleCharCount = document.getElementById('title-char-count');
  titleCharCount.textContent = `${data.title.length} characters`;
  if (data.title.length > 60) {
    titleCharCount.classList.add('exceeded');
    document.getElementById('title-status').classList.add('status-not-found');
  } else {
    document.getElementById('title-status').classList.add('status');
  }

  // Meta Description
  document.getElementById('metaDesc').textContent = data.metaDesc;
  const metaDescCharCount = document.getElementById('metaDesc-char-count');
  metaDescCharCount.textContent = `${data.metaDesc.length} characters`;
  if (data.metaDesc.length > 160 || data.metaDesc.length === 0 || data.metaDesc === 'Not found') {
    metaDescCharCount.classList.add('exceeded');
    document.getElementById('metaDesc-status').classList.add('status-not-found');
  } else {
    document.getElementById('metaDesc-status').classList.add('status');
  }

  // URL
  const pageUrlElement = document.getElementById('pageUrl');
  pageUrlElement.innerHTML = `<a href="${data.pageUrl}" target="_blank">${data.pageUrl}</a>`;

  // Canonical
  const canonicalElement = document.getElementById('canonical');
  canonicalElement.textContent = data.canonical;
  if (data.canonical === 'Not found') {
    document.getElementById('canonical-status').classList.add('status-not-found');
    document.getElementById('canonical-status').textContent = 'not found';
  } else {
    document.getElementById('canonical-status').classList.add('status');
    document.getElementById('canonical-status').textContent = 'canonical';
  }

  // Meta Robots
  document.getElementById('metaRobots').textContent = data.metaRobots;
  if (data.metaRobots === 'Not found' || data.metaRobots.toLowerCase().includes('noindex')) {
    document.getElementById('metaRobots-status').classList.add('status-not-found');
    document.getElementById('metaRobots-status').textContent = 'not indexable';
  } else {
    document.getElementById('metaRobots-status').classList.add('status');
    document.getElementById('metaRobots-status').textContent = 'indexable';
  }

  // Display heading counts
  document.getElementById('h1-count').textContent = data.headingCounts.h1;
  document.getElementById('h2-count').textContent = data.headingCounts.h2;
  document.getElementById('h3-count').textContent = data.headingCounts.h3;
  document.getElementById('h4-count').textContent = data.headingCounts.h4;
  document.getElementById('h5-count').textContent = data.headingCounts.h5;
  document.getElementById('h6-count').textContent = data.headingCounts.h6;

  // Display links and images counts
  document.getElementById('links-count').textContent = data.links.length;
  document.getElementById('images-count').textContent = data.images;

  const headingsList = document.getElementById('headingsList');
  headingsList.innerHTML = data.headings.length ? '' : '<li>No headings found</li>';

  // Build a tree-like structure for headings
  if (data.headings.length) {
    const ul = document.createElement('ul');
    ul.className = 'heading-tree';
    let currentLevel = 1;
    let currentUl = ul;
    const stack = [ul]; // Stack to keep track of nested ul elements

    data.headings.forEach(heading => {
      const level = parseInt(heading.tag.charAt(1)); // Extract number from 'H1', 'H2', etc.
      const li = document.createElement('li');
      li.textContent = `<${heading.tag}> ${heading.text}`;

      if (level === currentLevel) {
        // Same level, append to current ul
        currentUl.appendChild(li);
      } else if (level > currentLevel) {
        // Going deeper (e.g., H2 to H3)
        const newUl = document.createElement('ul');
        newUl.className = 'heading-tree';

        // Ensure currentUl has at least one li to append to
        if (!currentUl.lastChild) {
          const placeholderLi = document.createElement('li');
          placeholderLi.textContent = `<H${currentLevel}> [Placeholder]`;
          currentUl.appendChild(placeholderLi);
        }

        currentUl.lastChild.appendChild(newUl);
        currentUl = newUl;
        currentUl.appendChild(li);
        stack.push(currentUl);
        currentLevel = level;
      } else {
        // Going up (e.g., H3 to H2)
        while (currentLevel > level) {
          stack.pop();
          currentLevel--;
        }
        currentUl = stack[stack.length - 1];
        currentUl.appendChild(li);
      }
    });

    headingsList.appendChild(ul);
  }

  const linksList = document.getElementById('linksList');
  linksList.innerHTML = data.links.length ? '' : '<li>No links found</li>';
  data.links.forEach(l => {
    const li = document.createElement('li');
    if (l.imgSrc) {
      console.log(`Links Tab - Image Link Detected: ${l.imgSrc}`); // Debug log
      li.innerHTML = `Anchor Text: <span class="anchor-text image-anchor" data-img="${l.imgSrc}">${l.text}</span>${l.nofollow ? ' (nofollow)' : ''}<br>- <a href="${l.href}" target="_blank" class="link-url">${l.href}</a>`;
    } else {
      li.innerHTML = `Anchor Text: <span class="anchor-text">${l.text}</span>${l.nofollow ? ' (nofollow)' : ''}<br>- <a href="${l.href}" target="_blank" class="link-url">${l.href}</a>`;
    }
    linksList.appendChild(li);
  });

  // Add tooltip functionality for Links tab
  document.querySelectorAll('#links .image-anchor').forEach(anchor => {
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

  document.getElementById('exportOverview').onclick = () => {
    const text = `Title: ${data.title}\nMeta Description: ${data.metaDesc}\nURL: ${data.pageUrl}\nCanonical: ${data.canonical}\nMeta Robots: ${data.metaRobots}\nH1: ${data.headingCounts.h1}\nH2: ${data.headingCounts.h2}\nH3: ${data.headingCounts.h3}\nH4: ${data.headingCounts.h4}\nH5: ${data.headingCounts.h5}\nH6: ${data.headingCounts.h6}\nLinks: ${data.links.length}\nImages: ${data.images}`;
    download('overview.txt', text);
  };

  document.getElementById('exportHeadings').onclick = () => {
    const csv = 'Tag,Text\n' + data.headings.map(h => `${h.tag},"${h.text}"`).join('\n');
    download('headings.csv', csv);
  };

  document.getElementById('exportLinks').onclick = () => {
    const csv = 'Text,Href,Nofollow\n' + data.links.map(l => `"${l.text || 'Image Link'}",${l.href},${l.nofollow}`).join('\n');
    download('links.csv', csv);
  };
}

function fetchRobotsTxt(domain) {
  return fetch(`${domain}/robots.txt`)
    .then(response => {
      if (!response.ok) throw new Error('Not found or inaccessible');
      return response.text();
    })
    .catch(error => `Error: ${error.message}`);
}

async function fetchSitemapXml(domain) {
  const possibleLocations = [
    `${domain}/sitemap.xml`,
    `${domain}/sitemap_index.xml`,
    `${domain}/sitemap`
  ];

  for (const url of possibleLocations) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const urls = Array.from(xmlDoc.getElementsByTagName('loc')).map(loc => loc.textContent);
      return urls.length ? urls : ['No URLs found in sitemap'];
    } catch (e) {
      console.log(`Failed to fetch ${url}: ${e.message}`);
    }
  }

  try {
    const robotsText = await fetchRobotsTxt(domain);
    const sitemapLine = robotsText.split('\n').find(line => line.trim().startsWith('Sitemap:'));
    if (sitemapLine) {
      const sitemapUrl = sitemapLine.split('Sitemap:')[1].trim();
      const response = await fetch(sitemapUrl);
      if (response.ok) {
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const urls = Array.from(xmlDoc.getElementsByTagName('loc')).map(loc => loc.textContent);
        return urls.length ? urls : ['No URLs found in sitemap'];
      }
    }
  } catch (e) {
    console.log(`Failed to fetch sitemap from robots.txt: ${e.message}`);
  }

  return ['Error: No accessible sitemap found'];
}

function displayRobotsTxt(text) {
  const robotsTxtContent = document.getElementById('robotsTxtContent');
  robotsTxtContent.textContent = text;
  document.getElementById('exportRobotsTxt').onclick = () => {
    download('robots.txt', text);
  };
}

function displaySitemapXml(urls) {
  const sitemapList = document.getElementById('sitemapList');
  sitemapList.innerHTML = '';
  urls.forEach(url => {
    const li = document.createElement('li');
    li.textContent = url;
    if (url.startsWith('Error')) li.classList.add('error');
    sitemapList.appendChild(li);
  });
  document.getElementById('exportSitemapXml').onclick = () => {
    const csv = 'URL\n' + urls.map(url => `"${url}"`).join('\n');
    download('sitemap_urls.csv', csv);
  };
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setupTabs() {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');
    });
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const domain = new URL(tabs[0].url).origin;
  const currentUrl = tabs[0].url;

  chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    func: extractPageData
  }, (results) => {
    if (chrome.runtime.lastError || !results || !results[0]) {
      document.getElementById('title').textContent = 'Error: Could not access page data';
      document.getElementById('metaDesc').textContent = '';
      document.getElementById('pageUrl').textContent = '';
      document.getElementById('canonical').textContent = '';
      document.getElementById('metaRobots').textContent = '';
      document.getElementById('title-status').classList.add('status-not-found');
      document.getElementById('metaDesc-status').classList.add('status-not-found');
      document.getElementById('canonical-status').classList.add('status-not-found');
      document.getElementById('metaRobots-status').classList.add('status-not-found');
      document.getElementById('title-char-count').textContent = '0 characters';
      document.getElementById('metaDesc-char-count').textContent = '0 characters';
      document.getElementById('h1-count').textContent = '0';
      document.getElementById('h2-count').textContent = '0';
      document.getElementById('h3-count').textContent = '0';
      document.getElementById('h4-count').textContent = '0';
      document.getElementById('h5-count').textContent = '0';
      document.getElementById('h6-count').textContent = '0';
      document.getElementById('links-count').textContent = '0';
      document.getElementById('images-count').textContent = '0';
      document.getElementById('headingsList').innerHTML = '<li class="error">Error loading headings</li>';
      document.getElementById('linksList').innerHTML = '<li class="error">Error loading links</li>';
    } else {
      displayData(results[0].result);
    }
  });

  fetchRobotsTxt(domain).then(displayRobotsTxt);
  fetchSitemapXml(domain).then(displaySitemapXml);
});

setupTabs();