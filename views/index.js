function getTargetLinks(links, storyViews) {
  return links.filter(link => {
    let exist = false;
    for (let i = 0; i < storyViews.length; i++) {
      if (storyViews[i].story.path === link.path) {
        exist = true;
      };
    }
    return !exist;
  });
}

class StoryboardView {
  constructor(ctx, stories) {
    this.stories = stories;
    this.ctx = ctx;

    this.render();
  }

  crawl(links, storyViews) {
    const targetLinks = getTargetLinks(links, storyViews);

    if (targetLinks.length !== 0) {
      for (let i = 0; i < targetLinks.length; i++) {
        const targetLink = targetLinks[i];

        if (!~(storyViews.map(storyView => storyView.story.path).indexOf(targetLink.path))) {
          const story = this.stories.filter(story => story.path === targetLink.path)[0];

          if (story) {
            const storyView = new StoryView(this.ctx, story);
            storyViews.push(storyView);

            this.crawl(story.links, storyViews);
          }
        }
      }
    }
  }

  render() {
    const ORIGIN = 'http://localhost:8000';
    const ROOT_URL = ORIGIN;

    const storyViews = [];

    const initialLinks = [{
      href: ROOT_URL,
      path: '',
      external: false,
    }];

    this.crawl(initialLinks, storyViews);
  }
}

class StoryView {
  constructor(ctx, story) {
    console.log(`Create as ${story.path}`);
    this.story = story;
    this.ctx = ctx;
    this.pos = {x: story.depth * 400, y: Math.random() * 1000};

    this.render();
  }

  setPos(pos) {
    this.pos = Object.assign({}, this.pos, pos);
  }

  render() {
    const story = this.story;
    const img = new Image();

    img.src = './' + story.image;
    img.addEventListener('load', () => {
      const HEIGHT = 200;
      const ratio = HEIGHT / img.height;
      const width = img.width * ratio;
      this.ctx.drawImage(img, this.pos.x, this.pos.y, width, HEIGHT);
      this.ctx.strokeRect(this.pos.x, this.pos.y, width, HEIGHT);
    });
  }
}

window.addEventListener('load', () => {
  const stories = window.stories;
  const canvas = window.document.querySelector('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  new StoryboardView(canvas.getContext('2d'), stories);
});
