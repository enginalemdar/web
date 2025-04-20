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

app.post('/scrape', async (req, res) => {
  const { url, format = 'pdf' } = req.body;
  if (!url) return res.status(400).send('Missing url');

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    // 1) Navigate until the "load" event fires
    await page.goto(url, { waitUntil: 'load' });

    // 2) Then wait for network to go idle
    await page.waitForLoadState('networkidle');

    // 3) Give any late JS one more second (optional)
    await page.waitForTimeout(1000);

    // 4) Auto‑scroll to trigger lazy loads
    await page.evaluate(async () => {
      await new Promise((resolve) => {
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

    if (format === 'html') {
      const html = await page.content();
      return res
        .set('Content-Type', 'text/html')
        .set('Content-Disposition', 'attachment; filename="page.html"')
        .send(html);
    }

    // 5) Calculate full height and generate PDF
    const fullHeight = await page.evaluate(() => document.body.scrollHeight);
    const pdfBuffer = await page.pdf({
      width: '1920px',
      height: `${fullHeight}px`,
      landscape: true,
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });

    // 6) Send it
    return res
      .set('Content-Type', 'application/pdf')
      .set('Content-Disposition', 'attachment; filename="page.pdf"')
      .send(pdfBuffer);

  } catch (err) {
    console.error('Scrape error:', err);
    return res.status(500).send(`Scraping failed: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
});
