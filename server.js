const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/profile-pic', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.goto(`https://web.whatsapp.com/send?phone=${phone}`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(8000);

    const profilePicUrl = await page.evaluate(() => {
      const img = document.querySelector('img[src*="profile"]');
      return img ? img.src : 'N/A';
    });

    await browser.close();
    res.json({ phone, profilePicUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile picture' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serviço rodando em https://app.luxxie.com.br`));
