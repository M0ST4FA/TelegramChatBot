import { BotInfo, bot } from './constants.js';
import { UserInfo, messages } from './common.js';
import { settings, users } from './settings.js';
import CommandHandler from './CommandHandler.js';
import { sendDiagnosticMessage, DiagnosticMessage } from './diagnostics.js';
import Queue from 'yocto-queue';

export default class MessageHandler {
  // SENDING

  // Queueing
  static #messageQueue = new Queue();
  static #isProcessingQueue = false;
  static #MESSAGE_DELAY = 1000 / 20;

  // Helper methods

  static #enqueueMessage(sendToChatId, msg, options) {
    return new Promise((resolve, reject) => {
      MessageHandler.#messageQueue.enqueue({
        sendToChatId,
        msg,
        options,
        resolve,
        reject,
      });
      MessageHandler.#processQueue();
    });
  }

  static async #processQueue() {
    if (MessageHandler.#isProcessingQueue) return;
    MessageHandler.#isProcessingQueue = true;

    while (MessageHandler.#messageQueue.size > 0) {
      const message = MessageHandler.#messageQueue.dequeue();
      const { sendToChatId, msg, options, resolve, reject } = message;

      try {
        const result = await MessageHandler.#sendMessage(
          sendToChatId,
          msg,
          options,
        );
        resolve(result);
      } catch (error) {
        // Enqueue message again in order to try to send it later
        MessageHandler.#messageQueue.enqueue(message);

        // Handle the error
        if (error.response && error.response.statusCode === 429) {
          let retryAfter = error.response.body.parameters.retry_after || 30;
          console.warn(`Rate limit hit! Retrying after ${retryAfter} seconds.`);

          // Wait before resuming message sending
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else {
          console.error('Error sending message:', error);
          reject(error);
        }
      }

      // Delay between messages to comply with Telegram’s rate limits
      await new Promise(res => setTimeout(res, MessageHandler.#MESSAGE_DELAY));
    }

    MessageHandler.#isProcessingQueue = false;
  }

  static async #getText(msg) {
    const chatId = msg.chat.id;

    // Get the text to be sent
    const caption = msg.caption || '';
    let text = msg.text || '';
    text += caption;
    let quote = '';
    let username = '';
    let fullName = '';

    // The functions takes into account the state of the user
    if (chatId == BotInfo.ADMIN_CHAT_ID)
      quote = (await UserInfo.getResponderMessage(msg, false)).responderMsg;
    else {
      const senderInfo = await UserInfo.getSenderMessage(msg, false);
      quote = senderInfo.senderMsg;
      username = senderInfo.username;
      fullName = senderInfo.fullName;
    }

    text += `\n${quote}`;
    text = text.trim();

    const captionOption = {
      caption: quote ? text : undefined, // senderMessage determines whether or not user signs
      caption_entities: quote
        ? [
            {
              type: 'blockquote',
              offset: text.indexOf(quote),
              length: quote.length,
            },
          ]
        : [],
    };

    if (chatId != BotInfo.ADMIN_CHAT_ID && username == '@')
      captionOption.caption_entities.push({
        type: 'text_mention',
        offset: text.lastIndexOf(fullName),
        length: fullName.length,
        user: msg.from,
      });

    const textOption = {
      text,
    };

    const textQuoteOption = {
      entities: captionOption.caption_entities,
    };

    return {
      textOption,
      textQuoteOption,
      captionOption,
      quote,
    };
  }

  static async #sendMessage(sendToChatId, msg, options) {
    let sentMessageInOppositeChat;

    if (msg.text) {
      const entities = [...msg.entities, ...options.caption_entities];
      options.entities = entities;

      sentMessageInOppositeChat = bot.sendMessage(
        sendToChatId,
        options.text,
        options,
      );
    } else if (msg.photo?.length > 0)
      sentMessageInOppositeChat = bot.sendPhoto(
        sendToChatId,
        msg.photo.at(0).file_id,
        options,
      );
    else if (msg.video)
      sentMessageInOppositeChat = bot.sendVideo(
        sendToChatId,
        msg.video.file_id,
        options,
      );
    else if (msg.sticker)
      sentMessageInOppositeChat = bot.sendSticker(
        sendToChatId,
        msg.sticker.file_id,
        options,
      );
    else if (msg.document)
      sentMessageInOppositeChat = bot.sendDocument(
        sendToChatId,
        msg.document.file_id,
        options,
      );
    else if (msg.audio)
      sentMessageInOppositeChat = bot.sendAudio(
        sendToChatId,
        msg.audio.file_id,
        options,
      );
    else if (msg.voice)
      sentMessageInOppositeChat = bot.sendAudio(
        sendToChatId,
        msg.voice.file_id,
        options,
      );
    else if (msg.poll) {
      const poll = msg.poll;

      if (!msg.forward_from)
        sentMessageInOppositeChat = bot.sendPoll(
          sendToChatId,
          poll.question,
          poll.options,
          {
            is_anonymous: poll.is_anonymous,
            type: poll.type,
            allows_multiple_answers: poll.allows_multiple_answers,
            correct_option_id: poll.correct_option_id || null,
            explanation: poll.explanation || '',
            open_period: poll.open_period || null,
            close_date: poll.close_date || null,
            is_closed: poll.is_closed,
            total_voter_count: poll.total_voter_count,
            reply_to_message_id: options.reply_to_message_id,
          },
        );
      else
        sentMessageInOppositeChat = bot.forwardMessage(
          sendToChatId,
          msg.chat.id,
          msg.message_id,
        );
    } else if (msg.location)
      sentMessageInOppositeChat = bot.sendLocation(
        sendToChatId,
        msg.location.latitude,
        msg.location.longitude,
        options,
      );
    else if (msg.contact) {
      const contact = msg.contact;

      const opts = {
        reply_to_message_id: options.reply_to_message_id,
        last_name: contact.last_name,
        vcard: contact.vcard,
      };

      // Send the contact
      sentMessageInOppositeChat = bot.sendContact(
        sendToChatId,
        contact.phone_number,
        contact.first_name,
        opts,
      );
    } else {
      bot.sendMessage(sendToChatId, '🔴 Unknown message type.');
      return false;
    }

    const currentChatId = msg.chat.id;

    const msgInOppositeChat = await sentMessageInOppositeChat;

    const currentChatMsgId = msg.message_id;
    const oppositeChatMsgId = msgInOppositeChat.message_id;

    if (currentChatId == BotInfo.ADMIN_CHAT_ID)
      await messages.addAdminMessage(
        sendToChatId,
        oppositeChatMsgId,
        currentChatMsgId,
      );
    else
      await messages.addUserMessage(
        currentChatId,
        currentChatMsgId,
        oppositeChatMsgId,
      );

    if (
      !msg.text &&
      !msg.location &&
      !msg.contact &&
      !msg.sticker &&
      !msg.poll
    ) {
      const entities = [...msg.caption_entities, ...options.caption_entities];

      options.caption_entities = entities;

      bot
        .editMessageCaption(options.text, {
          chat_id: sendToChatId,
          message_id: oppositeChatMsgId,
          caption: options.caption,
          caption_entities: options.caption_entities,
        })
        .then(null, () => {
          setTimeout(() => {
            bot.deleteMessage(sendToChatId, oppositeChatMsgId);
            MessageHandler.#enqueueMessage(sendToChatId, msg, {
              ...options,
              reply_to_message_id: oppositeChatMsgId,
            });
          }, 1000 * 50);
        });
    }

    if (msg.sticker || msg.poll)
      if (options.caption)
        MessageHandler.#enqueueMessage(sendToChatId, options.caption, {
          ...options,
          reply_to_message_id: oppositeChatMsgId,
        });

    return true;
  }

  static async #sendAdminMessageToUserChat(msg) {
    const replyToMessage = msg.reply_to_message;
    const resArray = await Promise.allSettled([
      messages.getMessage(replyToMessage),
      MessageHandler.#getText(msg),
    ]);

    // GET INFORMATION ABOUT THE MESSAGE THE ADMIN IS REPLYING TO
    let messageSentByUser = false;

    // Get message info
    const messageBeingSent = resArray[0].value;
    if (messageBeingSent) messageSentByUser = messageBeingSent.forwarded;

    // If the message is not in bot data structures or has not been sent by user
    if (!messageSentByUser) return false; // Do not send anything

    // Find the chat id and message id in user chat
    const userChatId = messageBeingSent.userChatId;
    const messageIdInUserChat = messageBeingSent.userMessageId;

    // If the message is not found in user chat (probably not sent by the user or the chat has been deleted from the database)
    if (!userChatId) return false; // Do not send anything

    // PREPARE THE TEXT
    const { textOption, textQuoteOption, captionOption, quote } =
      resArray[1].value;

    // PREPARE THE OPTIONS
    const replyToMessageIdOption = {
      reply_to_message_id: settings.replies() ? messageIdInUserChat : undefined,
    };

    const options = {
      ...replyToMessageIdOption,
      ...textOption,
      ...textQuoteOption,
      ...captionOption,
      quote,
    };

    // SEND THE MESSAGE
    return MessageHandler.#enqueueMessage(userChatId, msg, options);
  }

  static async #forwardUserMessageToAdminChat(msg) {
    const userChatId = msg.chat.id;
    const messageIdInUserChat = msg.message_id;
    const replyToMessage = msg.reply_to_message;

    // Forward the user's message to the admin
    await bot
      .forwardMessage(BotInfo.ADMIN_CHAT_ID, userChatId, messageIdInUserChat)
      .then(async adminMsg => {
        // Store the original user message ID and chat ID
        await messages.addUserMessage(
          userChatId,
          messageIdInUserChat,
          adminMsg.message_id,
        );

        // If this message replies to another one
        if (replyToMessage) {
          const message = await messages.getMessage(replyToMessage);

          bot.sendMessage(BotInfo.ADMIN_CHAT_ID, 'The message responds to:', {
            reply_to_message_id: message.adminMessageId,
          });
        }

        // If the message is already forwarded from someone else
        if (msg.forward_from) {
          bot.sendMessage(
            BotInfo.ADMIN_CHAT_ID,
            `The message is forwarded from ${UserInfo.getFullNameFromUser(
              msg.forward_from,
            )}.\nThe original sender is ${UserInfo.getFullNameFromUser(
              msg.from,
            )}`,
            { reply_to_message_id: adminMsg.message_id },
          );
        }
      });
  }

  static async #sendUserMessageToAdminChat(msg) {
    const replyToMessage = msg.reply_to_message;
    const replyToMessageId = replyToMessage?.message_id;

    const resArray = await Promise.allSettled([
      MessageHandler.#getText(msg),
      replyToMessageId
        ? messages.getMessage(replyToMessage)
        : Promise.resolve(null),
    ]);

    // PREPARE THE TEXT
    const { textOption, textQuoteOption, captionOption, quote } =
      resArray[0].value;

    // PREPARE THE OPTIONS
    const replyToMessageIdOption = {
      reply_to_message_id: replyToMessage
        ? resArray[1]?.value?.adminMessageId
        : undefined,
    };

    const options = {
      ...replyToMessageIdOption,
      ...textOption,
      ...textQuoteOption,
      ...captionOption,
      quote,
    };

    // SEND THE MESSAGE
    return MessageHandler.#enqueueMessage(BotInfo.ADMIN_CHAT_ID, msg, options);
  }

  // Main methods
  static async sendAdminMessage(msg) {
    // Check if the admin's message is a reply to a forwarded message
    const replyToMessage = msg.reply_to_message;

    // If the message is not replying to any message, then the bot has nothing to do with it
    if (!replyToMessage || !replyToMessage.message_id) return false;

    // Handle potential commands first
    if (await CommandHandler.handleAdminChatReplyCommands(msg)) return true;

    if (await MessageHandler.#sendAdminMessageToUserChat(msg)) return true;

    return false;
  }

  static async sendUserMessage(msg) {
    // Check if the user's message is a reply to a forwarded message
    const replyToMessage = msg.reply_to_message;

    // If the message is a reply to another message
    if (replyToMessage && replyToMessage.message_id)
      if (await CommandHandler.handleUserChatReplyCommands(msg))
        // Handle potential commands first
        return true;

    // Get the private mode status of the user
    const userIsPrivate = await users.isUserPrivate(msg.from);

    // If forwarding mode is enabled AND also the user must not be in private mode
    if (settings.forwardMode() && !userIsPrivate)
      await MessageHandler.#forwardUserMessageToAdminChat(msg);
    // If forwarding mode is disabled or the user is in private mode
    else await MessageHandler.#sendUserMessageToAdminChat(msg);

    return true;
  }

  // EDITING
  static async editAdminMessageText(msg) {
    // Get basic message info
    const adminChatMsgId = msg.message_id;
    const resArray = await Promise.allSettled([
      UserInfo.getResponderMessage(msg, false),
      messages.getAdminMessageA(adminChatMsgId),
    ]);

    // Create final message text
    let text = msg.text || '';

    const responderInfo = resArray[0].value; // The function takes into account the state of the user
    const responderMsg = responderInfo.responderMsg;

    text += `\n${responderMsg}`;
    text = text.trim();

    // The message ID in the user's chat
    const { userMessageId: userChatMsgId, userChatId } = resArray[1].value;

    const options = {
      chat_id: userChatId,
      message_id: userChatMsgId,
      entities: responderMsg
        ? [
            {
              type: 'blockquote',
              offset: text.indexOf(responderMsg),
              length: responderMsg.length,
            },
          ]
        : [],
    };

    bot.editMessageText(text, options);
    sendDiagnosticMessage(
      DiagnosticMessage.EDITED_MESSAGE_TEXT,
      BotInfo.ADMIN_CHAT_ID,
      { reply_to_message_id: adminChatMsgId },
    );
  }

  static async editUserMessageText(msg) {
    // Get basic message info
    const userMsgId = msg.message_id;
    const userChatId = msg.chat.id;
    const resArray = await Promise.allSettled([
      UserInfo.getSenderMessage(msg, false),
      messages.getUserMessageU(userMsgId),
    ]);

    // Create final message text
    let text = msg.text || '';

    const senderInfo = resArray[0].value; // The function takes into account the state of the user
    const senderMsg = senderInfo.senderMsg;

    text += `\n${senderMsg}`;
    text = text.trim();

    // The message ID in the admin chat
    const message = resArray[1].value;
    const adminMsgId = message.adminMessageId;

    const options = {
      chat_id: BotInfo.ADMIN_CHAT_ID,
      message_id: adminMsgId,
      entities: senderInfo
        ? [
            {
              type: 'blockquote',
              offset: text.indexOf(senderMsg),
              length: senderMsg.length,
            },
          ]
        : [],
    };

    bot.editMessageText(text, options);
    sendDiagnosticMessage(DiagnosticMessage.EDITED_MESSAGE_TEXT, userChatId, {
      reply_to_message_id: userMsgId,
    });
  }

  static async editAdminMessageCaption(msg) {
    // Get basic message info
    const adminChatMsgId = msg.message_id;
    const resArray = await Promise.allSettled([
      UserInfo.getResponderMessage(msg, false),
      messages.getAdminMessageA(adminChatMsgId),
    ]);

    // Create final message text
    let text = msg.caption || '';

    const responderInfo = resArray[0].value; // The function takes into account the state of the user
    const responderMsg = responderInfo.responderMsg;

    text += `\n${responderMsg}`;
    text = text.trim();

    // The message ID in the user's chat
    const { userMessageId: userChatMsgId, userChatId } = resArray[1].value;

    const options = {
      chat_id: userChatId,
      message_id: userChatMsgId,
      caption_entities: responderMsg
        ? [
            {
              type: 'blockquote',
              offset: text.indexOf(responderMsg),
              length: responderMsg.length,
            },
          ]
        : [],
    };

    bot.editMessageCaption(text, options);
    sendDiagnosticMessage(
      DiagnosticMessage.EDITED_MESSAGE_CAPTION,
      BotInfo.ADMIN_CHAT_ID,
      { reply_to_message_id: adminChatMsgId },
    );
  }

  static async editUserMessageCaption(msg) {
    // Get basic message info
    const userChatMsgId = msg.message_id;
    const userChatId = msg.chat.id;
    const resArray = await Promise.allSettled([
      UserInfo.getResponderMessage(msg, false),
      messages.getUserMessageU(userChatMsgId),
    ]);

    // Create final message text
    let text = msg.caption || '';

    const senderInfo = resArray[0].value; // The function takes into account the state of the user
    const senderMsg = senderInfo.senderMsg;

    text += `\n${senderMsg}`;
    text = text.trim();

    // The message ID in the admin chat
    const message = resArray[1].value;
    const adminMsgId = message.adminMessageId;

    const options = {
      chat_id: BotInfo.ADMIN_CHAT_ID,
      message_id: adminMsgId,
      caption_entities: senderInfo
        ? [
            {
              type: 'blockquote',
              offset: text.indexOf(senderMsg),
              length: senderMsg.length,
            },
          ]
        : [],
    };

    bot.editMessageCaption(text, options);
    sendDiagnosticMessage(
      DiagnosticMessage.EDITED_MESSAGE_CAPTION,
      userChatId,
      { reply_to_message_id: userChatMsgId },
    );
  }
}
