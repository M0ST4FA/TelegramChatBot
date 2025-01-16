import { BotInfo, bot } from './constants.js';
import { UserInfo, messages } from './common.js';
import { settings, users } from './settings.js';
import CommandHandler from './CommandHandler.js';

export default class MessageHandler {

  static async #sendAdminMessageToUserChat(msg) {

    // Use reply_to_message_id to get the original message ID
    const replyToMessage = msg.reply_to_message;
    const messageIdInAdminChat = replyToMessage.message_id;

    // If the message is not forwarded from any user
    if (!(await messages.isMessageSentByUser(replyToMessage)))
      return false;

    // Find the chat id and message id in user chat
    const { userChatId, userMessageId: messageIdInUserChat } = await messages.getUserMessageA(messageIdInAdminChat)

    if (!userChatId)
      return false;

    const caption = msg.caption || '';
    let text = msg.text || '';
    text += caption;

    const responderInfo = await UserInfo.getResponderMessage(msg, false); // The function takes into account the state of the user

    const responderMsg = responderInfo.responderMsg;

    text += `\n${responderMsg}`;
    text = text.trim();

    // Forward the admin's reply back to the original user
    let adminSentMsgInUserChat;
    const replyToMessageIdOption = {
      reply_to_message_id: settings.replies() ? messageIdInUserChat : undefined
    }

    const captionOption = {
      caption: responderInfo ? text : undefined, // senderMessage determines whether or not user signs
      caption_entities: responderMsg ? [
        { type: 'blockquote', offset: text.indexOf(responderMsg), length: responderMsg.length }
      ] : []
    }

    const responderMessageOption = {
      entities: captionOption.caption_entities
    }

    if (!userChatId)
      return false;

    if (msg.text) {
      const options = {
        ...replyToMessageIdOption,
        ...responderMessageOption
      }

      adminSentMsgInUserChat = bot.sendMessage(userChatId, text, options);
    } else if (msg.photo?.length > 0) {

      const options = replyToMessageIdOption;
      // Send the photo
      adminSentMsgInUserChat = bot.sendPhoto(userChatId, msg.photo.at(0).file_id, options);
    } else if (msg.video) {

      const options = replyToMessageIdOption;

      // Send the video
      adminSentMsgInUserChat = bot.sendVideo(userChatId, msg.video.file_id, options);
    } else if (msg.sticker) {

      const options = replyToMessageIdOption;

      // Send the sticker
      adminSentMsgInUserChat = bot.sendSticker(userChatId, msg.sticker.file_id, options);
    } else if (msg.document) {

      const options = replyToMessageIdOption;

      // Send the document
      adminSentMsgInUserChat = bot.sendDocument(userChatId, msg.document.file_id, options);
    } else if (msg.audio) {

      const options = replyToMessageIdOption;

      // Send the audio
      adminSentMsgInUserChat = bot.sendAudio(userChatId, msg.audio.file_id, options);
    } else if (msg.voice) {

      const options = replyToMessageIdOption;

      // Send the audio
      adminSentMsgInUserChat = bot.sendAudio(userChatId, msg.voice.file_id, options);
    } else if (msg.location) {
      const options = replyToMessageIdOption;

      // Send the location
      adminSentMsgInUserChat = bot.sendLocation(userChatId, msg.location.latitude, msg.location.longitude, options);
    } else if (msg.contact) {

      const contact = msg.contact;

      const options = {
        ...replyToMessageIdOption,
        last_name: contact.last_name,
        vcard: contact.vcard
      }

      // Send the contact
      adminSentMsgInUserChat = bot.sendContact(userChatId,
        contact.phone_number,
        contact.first_name,
        options
      );
    } else {
      bot.sendMessage(BotInfo.ADMIN_CHAT_ID, "🔴 Unknown message type.");
    }

    const userChatMsg = await adminSentMsgInUserChat;
    const adminMsgId = msg.message_id;
    const userMsgId = userChatMsg.message_id;
    await messages.addAdminMessage(userChatId, userMsgId, adminMsgId)

    if (!msg.text && !msg.location && !msg.contact && !msg.sticker) {
      bot.editMessageCaption(text, {
        chat_id: userChatId,
        message_id: userMsgId,
        ...captionOption
      });
    }

    return true;
  }

  static async sendAdminMessage(msg) {

    // Check if the admin's message is a reply to a forwarded message
    const replyToMessage = msg.reply_to_message;

    // If the message is not replying to any message, then the bot has nothing to do with it
    if (!replyToMessage || !replyToMessage.message_id)
      return false;

    // Handle potential commands first
    if (await CommandHandler.handleAdminChatReplyCommands(msg))
      return true;

    if (await MessageHandler.#sendAdminMessageToUserChat(msg))
      return true;

    return false;
  }

  static async #forwardUserMessageToAdminChat(msg) {

    const userChatId = msg.chat.id;
    const messageIdInUserChat = msg.message_id;
    const replyToMessage = msg.reply_to_message;

    // Forward the user's message to the admin
    bot.forwardMessage(BotInfo.ADMIN_CHAT_ID, userChatId, messageIdInUserChat).then(async adminMsg => {
      // Store the original user message ID and chat ID
      await messages.addUserMessage(userChatId, messageIdInUserChat, adminMsg.message_id)

      // If this message replies to another one
      if (replyToMessage) {
        const message = await messages.getMessage(replyToMessage);

        bot.sendMessage(BotInfo.ADMIN_CHAT_ID, "The message responds to:", { reply_to_message_id: message.adminMessageId });
      }

      // If the message is already forwarded from someone else
      if (msg.forward_from) {
        bot.sendMessage(BotInfo.ADMIN_CHAT_ID, `The message is forwarded from ${UserInfo.getFullNameFromUser(msg.forward_from)}.\nThe original sender is ${UserInfo.getFullNameFromUser(msg.from)}`, { reply_to_message_id: adminMsg.message_id });
      }
    })

  }

  static async #sendUserMessageToAdminChat(msg) {

    // Common constants
    const userChatId = msg.chat.id;
    const messageIdInUserChat = msg.message_id;
    const replyToMessage = msg.reply_to_message;

    // This will be the text of text messages and the caption of other types of messages
    const caption = msg.caption || '';
    let text = msg.text || '';
    text += caption;

    const senderInfo = await UserInfo.getSenderMessage(msg, false); // The function takes into account the state of the user

    const senderMessage = senderInfo?.senderMsg || '';

    text += '\n' + senderMessage;
    text = text.trim();

    // Common options
    const replyToMessageIdOption = {
      reply_to_message_id: undefined
    }

    if (replyToMessage) {
      const message = await messages.getMessage(replyToMessage);
      replyToMessageIdOption.reply_to_message_id = message.adminMessageId;
    }

    const captionOption = {
      caption: senderInfo ? text : undefined, // senderMessage determines whether or not user signs
      caption_entities: senderInfo ? [
        { type: 'blockquote', offset: text.indexOf(senderMessage), length: senderMessage.length }
      ] : []
    }

    const senderMessageOption = {
      entities: captionOption.caption_entities
    }

    let userSentMsgInAdminChat;

    if (msg.text) {

      const options = {
        ...replyToMessageIdOption,
        ...senderMessageOption
      }

      userSentMsgInAdminChat = bot.sendMessage(BotInfo.ADMIN_CHAT_ID, text, options);

    } else if (msg.photo?.length > 0) {

      const options = replyToMessageIdOption;

      // Send the photo
      userSentMsgInAdminChat = bot.sendPhoto(BotInfo.ADMIN_CHAT_ID, msg.photo.at(0).file_id, options);

    } else if (msg.video) {

      const options = replyToMessageIdOption;

      // Send the video
      userSentMsgInAdminChat = bot.sendVideo(BotInfo.ADMIN_CHAT_ID, msg.video.file_id, options);

    } else if (msg.sticker) {

      const options = replyToMessageIdOption;

      // Send the sticker
      userSentMsgInAdminChat = bot.sendSticker(ADMIN_CHAT_ID, msg.sticker.file_id, options);
    } else if (msg.document) {

      const options = replyToMessageIdOption;

      // Send the document
      userSentMsgInAdminChat = bot.sendDocument(BotInfo.ADMIN_CHAT_ID, msg.document.file_id, options);
    } else if (msg.audio) {

      const options = replyToMessageIdOption;

      // Send the audio
      userSentMsgInAdminChat = bot.sendAudio(ADMIN_CHAT_ID, msg.audio.file_id, options);
    } else if (msg.voice) {

      const options = replyToMessageIdOption;

      // Send the audio
      userSentMsgInAdminChat = bot.sendAudio(BotInfo.ADMIN_CHAT_ID, msg.voice.file_id, options);

    }
    else if (msg.location) {

      const options = replyToMessageIdOption;

      // Send the location
      userSentMsgInAdminChat = bot.sendLocation(ADMIN_CHAT_ID, msg.location.latitude, msg.location.longitude, options);
    } else if (msg.contact) {

      const contact = msg.contact;

      const options = {
        ...replyToMessageIdOption,
        last_name: contact.last_name,
        vcard: contact.vcard
      }

      // Send the contact
      userSentMsgInAdminChat = bot.sendContact(BotInfo.ADMIN_CHAT_ID,
        contact.phone_number,
        contact.first_name,
        options
      );
    } else {
      bot.sendMessage(userChatId, "🔴 Unknown message type.");
    }

    const adminChatMsg = await userSentMsgInAdminChat;
    const adminChatMsgId = adminChatMsg.message_id;
    const userChatMsgId = messageIdInUserChat;

    await messages.addUserMessage(userChatId, userChatMsgId, adminChatMsgId)

    if (!msg.text && !msg.location && !msg.contact && !msg.sticker) {
      bot.editMessageCaption(text, {
        chat_id: BotInfo.ADMIN_CHAT_ID,
        message_id: adminChatMsgId,
        ...captionOption
      });
    }

  }

  static async sendUserMessage(msg) {

    // If forwarding mode is enabled AND also the user must not be in private mode
    if (settings.forwardMode() && !(await users.isUserPrivate(msg.from)))
      await MessageHandler.#forwardUserMessageToAdminChat(msg);
    else // If forwarding mode is disabled or the user is in private mode
      await MessageHandler.#sendUserMessageToAdminChat(msg);

    return true;
  }

  static async editAdminMessageText(msg) {

    // Get basic message info
    const adminChatMsgId = msg.message_id;

    // Create final message text
    let text = msg.text || '';

    const responderInfo = await UserInfo.getResponderMessage(msg, false); // The function takes into account the state of the user
    const responderMsg = responderInfo.responderMsg;

    text += `\n${responderMsg}`;
    text = text.trim();

    // The message ID in the user's chat
    const { userMessageId: userChatMsgId, userChatId } = await messages.getMessage(msg);

    const options = {
      chat_id: userChatId,
      message_id: userChatMsgId,
      entities: responderMsg ? [
        { type: 'blockquote', offset: text.indexOf(responderMsg), length: responderMsg.length }
      ] : []
    };

    bot.editMessageText(text, options);
    sendDiagnosticMessage(DiagnosticMessage.EDITED_MESSAGE_TEXT, ADMIN_CHAT_ID, { reply_to_message_id: adminChatMsgId });

  }

  static async editUserMessageText(msg) {

    // Get basic message info
    const userMsgId = msg.message_id;
    const userChatId = msg.chat.id;

    // Create final message text
    let text = msg.text || '';

    const senderInfo = await UserInfo.getSenderMessage(msg, false); // The function takes into account the state of the user
    const senderMsg = senderInfo.senderMsg;

    text += `\n${senderMsg}`;
    text = text.trim();

    // The message ID in the admin chat
    const message = await messages.getUserMessageU(userMsgId);
    const adminMsgId = message.adminMessageId;

    const options = {
      chat_id: BotInfo.ADMIN_CHAT_ID,
      message_id: adminMsgId,
      entities: senderInfo ? [
        { type: 'blockquote', offset: text.indexOf(senderMsg), length: senderMsg.length }
      ] : []
    };

    bot.editMessageText(text, options);
    sendDiagnosticMessage(DiagnosticMessage.EDITED_MESSAGE_TEXT, userChatId, { reply_to_message_id: userMsgId });

  }

  static async editAdminMessageCaption(msg) {

    // Get basic message info
    const adminChatMsgId = msg.message_id;

    // Create final message text
    let text = msg.caption || '';

    const responderInfo = await UserInfo.getResponderMessage(msg, false); // The function takes into account the state of the user
    const responderMsg = responderInfo.responderMsg;

    text += `\n${responderMsg}`;
    text = text.trim();

    // The message ID in the user's chat
    const { userMessageId: userChatMsgId, userChatId } = await messages.getMessage(msg);

    const options = {
      chat_id: userChatId,
      message_id: userChatMsgId,
      caption_entities: responderMsg ? [
        { type: 'blockquote', offset: text.indexOf(responderMsg), length: responderMsg.length }
      ] : []
    }

    bot.editMessageCaption(text, options)
    sendDiagnosticMessage(DiagnosticMessage.EDITED_MESSAGE_CAPTION, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: adminChatMsgId });

  }

  static async editUserMessageCaption(msg) {

    // Get basic message info
    const userChatMsgId = msg.message_id;
    const userChatId = msg.chat.id;

    // Create final message text
    let text = msg.caption || '';

    const senderInfo = await UserInfo.getSenderMessage(msg, false);  // The function takes into account the state of the user
    const senderMsg = senderInfo.senderMsg;

    text += `\n${senderMsg}`;
    text = text.trim();

    // The message ID in the admin chat
    const message = await messages.getUserMessageU(userChatMsgId);
    const adminMsgId = message.adminMessageId;

    const options = {
      chat_id: BotInfo.ADMIN_CHAT_ID,
      message_id: adminMsgId,
      caption_entities: senderInfo ? [
        { type: 'blockquote', offset: text.indexOf(senderMsg), length: senderMsg.length }
      ] : []
    }

    bot.editMessageCaption(text, options);
    sendDiagnosticMessage(DiagnosticMessage.EDITED_MESSAGE_CAPTION, userChatId, { reply_to_message_id: userChatMsgId });

  }

}

