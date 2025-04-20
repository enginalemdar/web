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

    // 1. Go to the page
    await page.goto(url, { waitUntil: 'networkidle' });

    // 2. Emulate print media so @media print CSS kicks in
    await page.emulateMedia({ media: 'print' });  :contentReference[oaicite:0]{index=0}

    if (format === 'html') {
      const html = await page.content();
      return res
        .set('Content-Type', 'text/html')
        .set('Content-Disposition', 'attachment; filename="page.html"')
        .send(Buffer.from(html, 'utf-8'));
    }

    // 3. Generate PDF with margins, scale, background, and CSS page sizing
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,               // include CSS backgrounds
      preferCSSPageSize: true,             // respect any @page size in CSS
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      scale: 0.85                          // shrink content to fit wider layouts
    });                                      :contentReference[oaicite:1]{index=1}

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
