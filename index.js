const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const transitionTypes = {
  ACCESS: 'access',
  LINK: 'link',
  FORM: 'form',
  JS: 'js',
};

// page
//   location
//   title
//   screenshot
//   transition
// transition
//   type: access, link, form, js
//     access:
//       url
//     link:
//       el
//       href
// location
//   protocol
//   href
//   origin
//   pathname
//   search
//   hash

const config = require('./config');

async function createPage(currentPage, transition) {
  console.log(`Creating page`);

  const browserPage = await browser.newPage();
  if (currentPage) {
    await browserPage.goto(currentPage.href);
  }

  let page = null;

  browserPage.on('load', async () => {
    console.log('load');
    page = await browserPage.evaluate((transitionTypes) => {
      function normalizeURL(url) {
        return (url[url.length - 1] === '/') ? url.substring(0, url.length - 1) : url;
      }

      const location_ = {
        protocol: window.location.protocol,
        origin: window.location.origin,
        pathname: normalizeURL(window.location.pathname),
        href: normalizeURL(window.location.href),
        search: window.location.search,
        hash: window.location.hash,
      };

      const linkElements = window.document.querySelectorAll('a');
      const transitions = Array.prototype.map.call(linkElements, el => {
        return {
          type: transitionTypes.LINK,
          el: el,
        };
      });

      console.log({
        screenshot: `/${location_.pathname.replace(/\//g, '__')}_screenshot.png`,
        title: window.document.title,
        location: location_,
        transitions,
      });

      return {
        screenshot: `/${location_.pathname.replace(/\//g, '__')}_screenshot.png`,
        title: window.document.title,
        location: location_,
        transitions,
      };
    }, transitionTypes);

    await browserPage.screenshot({
      path: config.dist + page.screenshot,
    });
  });

  switch(transition.type) {
    case (transitionTypes.ACCESS): {
      await browserPage.goto(transition.url);
      break;
    }
    case (transitionTypes.LINK): {
      await browserPage.evaluate((transition) => {
        transition.el.click();
      }, transition);
      break;
    }
  }

  return page;
}

async function crawl(page, pages) {
  for (let i = 0; i < page.transitions.length; i++) {
    const transition = page.transitions[i];
    const newPage = await createPage(page, transition);
    pages.push(newPage);
  }

  if (page.transitions.length) {
    await crawl(page.transitions, pages);
  }
}

(async () => {
  global.browser = await puppeteer.launch();

  const initialPage = await createPage(null, {
    type: transitionTypes.ACCESS,
    url: config.root,
  });
  console.log(initialPage);
  const pages = [initialPage];

  if (initialPage) {
    await crawl(initialPage, pages);
  }

  await global.browser.close();

  fs.writeFile(config.dist + 'pages.js', `
  window.stories = JSON.parse('${JSON.stringify(pages)}');
  `, () => {
    console.log('The file has been saved!');
  });
})();
