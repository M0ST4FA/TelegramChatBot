import bot from './src/bot.js';
import express from 'express';

const app = express();
app.use(express.json());

app.post(`/api/webhook/${process.env.BOT_TOKEN}`, function (req, res) {
  try {
    bot.processUpdate(req.body);
    res.status(200).send();
  } catch (err) {
    console.log(
      `Message: ${err.message}\nResponse Body: ${err.response?.body}\nStack: ${
        err.stack
      }\nMessage Cache: ${JSON.stringify(
        messages.messages(),
      )}\nKey Mapping A2U: ${JSON.stringify(
        messages.keyMappingA2U(),
      )}\nResponse: ${err.response}`,
    );
  }
});

// Endpoint for setting the webhook
app.post('webhook', async function (req, res) {
  try {
    await bot.setWebHook(`${BotInfo.WEBHOOK_URL}/webhook/${BotInfo.BOT_TOKEN}`);
    bot.getWebHookInfo().then(webhookInfo => {
      console.log(
        `Webhook info:\nURL: ${webhookInfo.url}\nAllowed updates: ${
          webhookInfo.allowed_updates
            ? webhookInfo.allowed_updates
            : 'All update types'
        }\nPending update count: ${webhookInfo.pending_update_count}`,
      );
      res.status(200).json({ success: true, url: webhookInfo.url });
    });
    console.log('Using webhooks.');
  } catch (err) {
    console.log(
      `Message: ${err.message}\nResponse Body: ${err.response?.body}\nStack: ${
        err.stack
      }\nMessage Cache: ${JSON.stringify(
        messages.messages(),
      )}\nKey Mapping A2U: ${JSON.stringify(
        messages.keyMappingA2U(),
      )}\nResponse: ${err.response}`,
    );
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;
