const puppeteer = require('puppeteer');
const fs = require('fs');

// link
//   href
//   path
//   external
//
// story
//   href
//   path
//   links
//   title
//   image

const DIST = './views/';

async function createStory(page, url) {
  console.log(`Creating story....: ${url}`);

  await page.goto(url);

  const story = await page.evaluate(() => {
    function normalizeURL(url) {
      return (url[url.length - 1] === '/') ? url.substring(0, url.length - 1) : url;
    }

    const origin = window.location.origin;
    const href = normalizeURL(window.location.href);
    const path = href.replace(origin, '');

    const linkElements = window.document.querySelectorAll('a');
    const links = Array.prototype.map.call(linkElements, el => {
      const normalizedHref = normalizeURL(el.href)
      const link = {
        href: normalizedHref,
        path: normalizedHref.replace(origin, ''),
        external: false,
      };

      if (!~el.href.indexOf(origin)) {
        link.external = true;
      }
      return link;
    });

    return {
      path,
      href,
      links,
      title: window.document.title,
      image: `/${path.replace(/\//g, '__')}_screenshot.png`,
    };
  });

  await page.screenshot({
    path: DIST + story.image,
  });

  return story;
}

function getTargetLinks(links, stories) {
  return links.filter(link => {
    let exist = false;
    for (let i = 0; i < stories.length; i++) {
      if (stories[i].path === link.path) {
        exist = true;
      };
    }
    return !exist;
  });
}

async function crawl(links, stories, page) {
  const targetLinks = getTargetLinks(links, stories);
  if (targetLinks.length !== 0) {
    for (let i = 0; i < targetLinks.length; i++) {
      const targetLink = targetLinks[i];
      if (!~(stories.map(story => story.path).indexOf(targetLink.path))) {
        const story = await createStory(page, targetLink.href);
        stories.push(story);
        if (!targetLink.external) {
          await crawl(story.links, stories, page);
        }
      }
    }
  }
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const ORIGIN = 'http://localhost:8000';
  const ROOT_URL = ORIGIN;

  const stories = [];

  const initialLinks = [{
    href: ROOT_URL,
    path: '',
    external: false,
  }];

  await crawl(initialLinks, stories, page);

  await browser.close();

  fs.writeFile(DIST + 'stories.json', JSON.stringify(stories), () => {
    console.log('The file has been saved!');
  });
})();
