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
    await page.goto(url, { waitUntil: 'networkidle' });

    if (format === 'html') {
      const html = await page.content();
      const buffer = Buffer.from(html, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename="page.html"');
      return res.send(buffer);
    }

    const pdfBuffer = await page.pdf({ format: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="page.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).send('Scraping failed');
  } finally {
    if (browser) await browser.close();
  }
});
