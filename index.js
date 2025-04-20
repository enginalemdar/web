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

    // 1. Navigate and wait for network‐idle
    await page.goto(url, { waitUntil: 'networkidle' });

    // 2. Apply @media print CSS rules
    await page.emulateMedia({ media: 'print' });

    if (format === 'html') {
      const html = await page.content();
      return res
        .set('Content-Type', 'text/html')
        .set('Content-Disposition', 'attachment; filename="page.html"')
        .send(Buffer.from(html, 'utf-8'));
    }

    // 3. Generate a 1920px‑wide landscape PDF
    const pdfBuffer = await page.pdf({
      width: '1920px',                     // custom width in pixels :contentReference[oaicite:0]{index=0}
      height: '1080px',                    // choose a height (e.g. 1080px) :contentReference[oaicite:1]{index=1}
      landscape: true,                     // rotate to horizontal :contentReference[oaicite:2]{index=2}
      printBackground: true,               // include CSS backgrounds :contentReference[oaicite:3]{index=3}
      preferCSSPageSize: true,             // respect any @page size in your CSS :contentReference[oaicite:4]{index=4}
      margin: {                           // safe gutter so nothing is clipped
        top:    '1cm',
        right:  '1cm',
        bottom: '1cm',
        left:   '1cm'
      }
    });

    // 4. Send it back
    res
      .set('Content-Type', 'application/pdf')
      .set('Content-Disposition', 'attachment; filename="page.pdf"')
      .send(pdfBuffer);

  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).send('Scraping failed');
  } finally {
    if (browser) await browser.close();
  }
});
