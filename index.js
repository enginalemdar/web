const express = require('express');
const { chromium } = require('playwright');
const morgan = require('morgan');

const app = express();
app.use(morgan('combined'));
app.use(express.json({ limit: '5mb' }));

// Disable default timeout for long pages
const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening on port ${process.env.PORT || 3000}`);
});
server.timeout = 0;

/**
 * POST /scrape
 * body: { url: string, format?: 'pdf' | 'html' }
 * Returns: PDF or HTML binary (Content-Disposition: attachment)
 */
app.post('/scrape', async (req, res) => {
  const { url, format = 'pdf' } = req.body;
  if (!url) return res.status(400).send('Missing url');

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    // 1. Navigate, wait for load + idle
await page.goto(url, {
  waitUntil: ['load', 'networkidle']
});

// 2. Double‑check idle
await page.waitForLoadState('networkidle');

// 3. Wait for a known element (fallback)
await page.waitForSelector('.main-content', { timeout: 10000 });

// 4. Optional scroll for lazy content
await page.evaluate(async () => {
  await new Promise(resolve => {
    let total = 0, step = 100;
    const timer = setInterval(() => {
      window.scrollBy(0, step);
      total += step;
      if (total >= document.body.scrollHeight) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
});
// 5. Generate PDF
const pdfBuffer = await page.pdf({
  width: '1920px',
  height: '1080px',
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
});

  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).send('Scraping failed');
  } finally {
    if (browser) await browser.close();
  }
});
