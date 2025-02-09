import { BotInfo, bot, prisma } from './constants.js';
import { messages } from './common.js';
import { admins, settings, users } from './settings.js';
import CommandHandler from './CommandHandler.js';
import MessageHandler from './MessageHandler.js';
import {
  DiagnosticMessage,
  Diagnostics,
  sendDiagnosticMessage,
} from './diagnostics.js';

// Handle incoming messages from users
bot.on('message', async msg => {
  try {
    const chatId = msg.chat.id;

    // messages COMING FROM USER CHATS
    if (chatId != BotInfo.ADMIN_CHAT_ID) {
      // If the user has sent a command, handle it
      if (await CommandHandler.handleUserChatCommands(msg)) return;

      // If the user (chat, both have the same ID) is banned, do nothing
      if (await users.isUserBanned(msg.from)) return;

      if (await MessageHandler.sendUserMessage(msg)) return;
    } else {
      // messages COMING FROM THE ADMIN CHAT

      // If this returns true, that means the message was a command
      if (await CommandHandler.handleAdminChatCommands(msg)) return;

      // If this returns true, the message was handled successfully
      if (await MessageHandler.sendAdminMessage(msg)) return;
    }
  } catch (err) {
    console.log(err);

    const parsedBody = err.response?.body;

    if (parsedBody?.error_code === 403)
      sendDiagnosticMessage(
        DiagnosticMessage.BOT_WAS_BLOCKED_BY_USER,
        BotInfo.ADMIN_CHAT_ID,
        { reply_to_message_id: msg.message_id },
      );
    else bot.sendMessage(BotInfo.ADMIN_CHAT_ID, `Exception: ${err.message}`);
  }
});

bot.on('callback_query', async callbackQuery => {
  const queryType = callbackQuery.data;
  const isAdminMessage = callbackQuery.message.chat.id == BotInfo.ADMIN_CHAT_ID;
  const user = callbackQuery.from;

  const editMessageReplyMarkupOptions = {
    chat_id: callbackQuery.message.chat.id,
    inline_message_id: callbackQuery.inline_message_id,
    message_id: callbackQuery.message.message_id,
  };
  let doNotGoToMain = false;

  if (isAdminMessage) {
    try {
      if (queryType.startsWith('unban')) {
        const regex = /\d+/.exec(queryType);

        await users.unbanUser({ id: regex[0] });

        await bot.editMessageReplyMarkup(
          { inline_keyboard: await CommandHandler.getBannedUsersKeyboard() },
          editMessageReplyMarkupOptions,
        );

        doNotGoToMain = true;
      } else
        switch (queryType) {
          case 'toggle_sign_messages': {
            const adminSigns = await admins.adminSigns(user);
            if (adminSigns) await admins.disableSigning(user);
            else await admins.enableSigning(user);

            break;
          }

          case 'toggle_forwarding': {
            const forwarding = settings.forwardMode();
            await settings.setForwardMode(!forwarding);

            break;
          }

          case 'toggle_replies': {
            const replies = settings.replies();
            await settings.setReplies(!replies);

            break;
          }

          case 'change_language': {
            await Promise.all([
              bot.editMessageText(
                Diagnostics.languageSettingsMessage(),
                editMessageReplyMarkupOptions,
              ),
            ]);

            await bot.editMessageReplyMarkup(
              { inline_keyboard: CommandHandler.getLanguageMenuKeyboard() },
              editMessageReplyMarkupOptions,
            );
            doNotGoToMain = true;
            break;
          }

          case 'set_language_arabic': {
            await Promise.all([settings.setLanguage('ar')]);
            break;
          }

          case 'set_language_english': {
            await Promise.all([settings.setLanguage('en')]);

            break;
          }

          case 'manage_banned_users': {
            await Promise.all([
              bot.editMessageText(
                Diagnostics.manageBannedUsersMessage(),
                editMessageReplyMarkupOptions,
              ),
            ]);

            await bot.editMessageReplyMarkup(
              {
                inline_keyboard: await CommandHandler.getBannedUsersKeyboard(),
              },
              editMessageReplyMarkupOptions,
            );

            doNotGoToMain = true;
            break;
          }

          case 'move_to_main_menu': {
            break; // The default behavior is displaying the main menu
          }

          case 'statistics': {
            const stats = await Promise.all([
              prisma.user.count(),
              prisma.admin.count(),
              prisma.message.count(),
            ]);

            await Promise.all([
              await bot.editMessageText(
                Diagnostics.statisticsMessage(stats),
                editMessageReplyMarkupOptions,
              ),
              await bot.editMessageReplyMarkup(
                {
                  inline_keyboard: [CommandHandler.getMainMenuKeyboardButton()],
                },
                editMessageReplyMarkupOptions,
              ),
            ]);

            doNotGoToMain = true;
            break;
          }
          case 'finish_editing_admin_settings': {
            bot.deleteMessage(
              callbackQuery.message.chat.id,
              callbackQuery.message.message_id,
            );
            doNotGoToMain = true;
            break;
          }
        }

      await Promise.all([
        doNotGoToMain
          ? null
          : bot.editMessageReplyMarkup(
              {
                inline_keyboard: await CommandHandler.getAdminSettingsKeyboard(
                  user,
                ),
              },
              editMessageReplyMarkupOptions,
            ),
        doNotGoToMain
          ? null
          : bot.editMessageText(
              Diagnostics.settingsMessage(),
              editMessageReplyMarkupOptions,
            ),
      ]);

      setTimeout(bot.answerCallbackQuery.bind(bot, callbackQuery.id), 500);
    } catch (error) {
      console.log(error.message);
    }
  } else {
    try {
      switch (queryType) {
        case 'toggle_private_mode': {
          const userIsPrivate = await users.isUserPrivate(user);
          if (userIsPrivate) await users.makeUserNonPrivate(user);
          else await users.makeUserPrivate(user);

          break;
        }

        case 'change_active_channel': {
        }

        case 'finish_editing_user_settings': {
          bot.deleteMessage(
            callbackQuery.message.chat.id,
            callbackQuery.message.message_id,
          );
          doNotGoToMain = true;
          break;
        }
      }

      await Promise.all([
        doNotGoToMain
          ? null
          : bot.editMessageReplyMarkup(
              {
                inline_keyboard: await CommandHandler.getUserSettingsKeyboard(
                  user,
                ),
              },
              editMessageReplyMarkupOptions,
            ),
        doNotGoToMain
          ? null
          : bot.editMessageText(
              Diagnostics.settingsMessage(),
              editMessageReplyMarkupOptions,
            ),
      ]);

      setTimeout(bot.answerCallbackQuery.bind(bot, callbackQuery.id), 500);
    } catch (err) {
      console.log(err.message);
    }
  }
});

bot.on('webhook_error', async error => {
  console.log(error.cause);
});

bot.on('edited_message_text', async msg => {
  const msgChatId = msg.chat.id;

  if (msgChatId == BotInfo.ADMIN_CHAT_ID) {
    const replyToMessage = msg.reply_to_message;

    // If this is not a message that replies to another message
    if (!replyToMessage) return;

    // If this is not a message we've sent to some user
    const message = await messages.getMessage(msg);

    if (!message) return;

    if (message.forwarded) return;

    if (msg.text) MessageHandler.editAdminMessageText(msg);
  } else {
    // If the bot doesn't know about this message
    if (!(await messages.isMessageSentByUser(msg))) return;

    if (msg.text) MessageHandler.editUserMessageText(msg);
  }

  return;
});

bot.on('edited_message_caption', async msg => {
  const msgChatId = msg.chat.id;

  if (msgChatId == BotInfo.ADMIN_CHAT_ID) {
    const replyToMessage = msg.reply_to_message;

    // If this is not a message that replies to another message
    if (!replyToMessage) return;

    // If this is not a message we've sent to some user
    if (!(await messages.isMessageSentByAdmin(msg))) return;

    if (msg.caption) MessageHandler.editAdminMessageCaption(msg);
  } else {
    // If the bot doesn't know about this message
    if (!(await messages.getMessage(msg))) return;

    if (msg.caption) MessageHandler.editUserMessageCaption(msg);
  }

  return;
});
