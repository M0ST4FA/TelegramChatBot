import { BotInfo, bot } from './constants.js';
import { UserInfo, messages } from './common.js';
import { settings, users, admins } from './settings.js';
import { sendDiagnosticMessage, DiagnosticMessage } from './diagnostics.js';

const banChat = async function (chatId, banMsgId) {

  const options = {
    reply_to_message_id: banMsgId,
    user: { id: chatId } // Fill it for the first call
  }

  // If user is already banned
  if (await users.isUserBanned({ id: chatId }))
    return sendDiagnosticMessage(DiagnosticMessage.USER_IS_ALREADY_BANNED, BotInfo.ADMIN_CHAT_ID, options);

  // Add the user to the list of banned users
  await users.banUser({ id: chatId });

  // Send diagnostic message to the user
  sendDiagnosticMessage(DiagnosticMessage.USER_BANNING_MESSAGE, chatId);

  // Send diagnostic message to admin chat
  const chatMember = await bot.getChatMember(chatId, chatId);
  const user = chatMember.user;
  options.user = user;
  sendDiagnosticMessage(DiagnosticMessage.ADMIN_BANNING_MESSAGE, BotInfo.ADMIN_CHAT_ID, options);
}

const unbanChat = async function (chatId, unbanMsgId) {

  const options = {
    reply_to_message_id: unbanMsgId,
    user: { id: chatId } // Fill it for the first call
  }

  // If user is already not banned
  if (!(await users.isUserBanned({ id: chatId })))
    return sendDiagnosticMessage(DiagnosticMessage.USER_IS_ALREADY_NOT_BANNED, BotInfo.ADMIN_CHAT_ID, options);

  // Remove the user from the list of banned users
  await users.unbanUser({ id: chatId });

  // Inform the user that they have been removed from the list of banned users
  sendDiagnosticMessage(DiagnosticMessage.USER_NO_LONGER_BANNED_MESSAGE, chatId);

  // Inform the admin chat that the user has been removed from the list of banned users
  const chatMember = await bot.getChatMember(chatId, chatId);
  const user = chatMember.user;
  options.user = user;
  sendDiagnosticMessage(DiagnosticMessage.ADMIN_USER_NO_LONGER_BANNED_MESSAGE, BotInfo.ADMIN_CHAT_ID, options);

}

const initializeBot = async function () {

  const initializedObj = await prisma.setting.findUnique({
    where: {
      key: 'initialized'
    }
  });

  const initialized = initializedObj ? initializedObj.value : false;

  if (initialized) {
    bot.sendMessage(BotInfo.ADMIN_CHAT_ID, 'Bot is already initialized.');
    return true;
  }

  const settings = [
    { key: 'replies', value: JSON.stringify(true) },
    { key: 'forwardMode', value: JSON.stringify(false) },
    { key: 'language', value: JSON.stringify('ar') },
    { key: 'initialized', value: JSON.stringify(true) }
  ];

  const settingPromiseArr = [];
  for (const setting of settings)
    settingPromiseArr.push(prisma.setting.create(
      {
        data: { key: setting.key, value: setting.value }
      }
    ));

  await Promise.allSettled(settingPromiseArr);
  bot.sendMessage(BotInfo.ADMIN_CHAT_ID, 'Initialized bot.');

  return true;
}

export default class CommandHandler {

  static async #mapForwardedMessageToUserChatID(adminMsg) {

    const userMessage = await messages.getUserMessageA(adminMsg.message_id);

    if (!userMessage) {
      sendDiagnosticMessage(DiagnosticMessage.MESSAGE_NOT_PRESENT_BOT_DATA_STRUCTURES, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: adminMsg.message_id });
      return {};
    }

    return userMessage;
  }

  static handleAdminChatCommands = async function (msg) {

    const msgText = msg.text || '';

    if (!msgText)
      return false;

    if (msgText[0] != '/')
      return false;

    if (msgText == '/log') {
      bot.sendMessage(BotInfo.ADMIN_CHAT_ID, `Reimplement this command.`);
      return true;
    }
    else if (msgText == '/commands')
      sendDiagnosticMessage(DiagnosticMessage.ADMIN_COMMANDS_MESSAGE, ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id });
    else if (msgText == '/init')
      await initializeBot();
    else if (msgText.startsWith('/sign')) {
      const regexMatch = /\/sign (on|off)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id, correct_format: '/sign on\\|off' })
        return true;
      }

      const res = regexMatch.at(1);

      const options = {
        reply_to_message_id: msg.message_id,
        user: msg.from
      }

      if (res == 'off') {
        await admins.disableSigning(msg.from);
        sendDiagnosticMessage(DiagnosticMessage.USER_MESSAGES_WILL_NOT_BE_SIGNED_MESSAGE, BotInfo.ADMIN_CHAT_ID, options);
      } else {
        await admins.enableSigning(msg.from);
        sendDiagnosticMessage(DiagnosticMessage.USER_MESSAGES_WILL_BE_SIGNED_MESSAGE, BotInfo.ADMIN_CHAT_ID, options);
      }

    } else if (msgText.startsWith('/replies')) {
      const regexMatch = /\/replies (on|off)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id, correct_format: '/replies on\\|off' })
        return true;
      }

      const res = regexMatch.at(1);

      const options = {
        replied_to_message_id: msg.message_id
      }

      if (res == 'off') {
        await settings.setReplies(off);
        sendDiagnosticMessage(DiagnosticMessage.HIDE_REPLIED_TO_MESSAGES_MESSAGE, BotInfo.ADMIN_CHAT_ID, options);
      } else {
        await settings.setReplies(on);
        sendDiagnosticMessage(DiagnosticMessage.SHOW_REPLIED_TO_MESSAGES_MESSAGE, BotInfo.ADMIN_CHAT_ID, options);
      }

    } else if (msgText.startsWith('/forwarding')) {
      const regexMatch = /\/forwarding (on|off)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id, correct_format: '/forwarding on\\|off' })
        return true;
      }

      const res = regexMatch.at(1);

      const options = {
        reply_to_message_id: msg.message_id
      }

      if (res == 'off') {
        await settings.setForwardMode(false);
        sendDiagnosticMessage(DiagnosticMessage.FORWARDING_IS_OFF_MESSAGE, BotInfo.ADMIN_CHAT_ID, options);
      } else {
        await settings.setForwardMode(true);
        sendDiagnosticMessage(DiagnosticMessage.FORWARDING_IS_ON_MESSAGE, BotInfo.ADMIN_CHAT_ID, options);
      }

    } else if (msgText == '/bannedUsers') {
      const bndChatIds = await getBannedChatIds();

      if (bndChatIds.length == 0) {
        sendDiagnosticMessage(DiagnosticMessage.NO_BANNED_USERS_EXIST, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id })
        return true;
      }

      sendDiagnosticMessage(DiagnosticMessage.DISPLAYING_BANNED_USERS_NOW, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id })
      for (const chatId of bndChatIds) {
        bot.getChatMember(chatId, chatId)
          .then(async member => {
            const user = member.user;

            if (await users.isUserPrivate(user)) {
              bot.sendMessage(BotInfo.ADMIN_CHAT_ID, `${user.id} [User is in private mode]`);
              return;
            }

            const username = UserInfo.getUserNameFromUser(user);
            const fullName = UserInfo.getFullNameFromUser(user);
            const msg = `${fullName} (${username}:${chatId})`;

            bot.sendMessage(BotInfo.ADMIN_CHAT_ID, msg,
              { entities: [{ type: "mention", offset: msg.indexOf(username), length: username.length }] }
            );
          });
      }

    } else if (msgText.startsWith('/ban ')) {
      const regexMatch = /\/ban (\d{8,})/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id, correct_format: '/ban <user ID>' })
        return true;
      }

      const chatId = +regexMatch.at(1);
      banChat(chatId, msg.message_id);

    } else if (msgText.startsWith('/unban ')) {
      const regexMatch = /\/unban (\d{8,})/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id, correct_format: '/unban <user ID>' })
        return true;
      }

      const chatId = +regexMatch.at(1);
      unbanChat(chatId, msg.message_id);

    } else if (msgText.startsWith('/language')) {
      const regexMatch = /\/language (ar|en)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(DiagnosticMessage.BOT_LANGUAGE_MESSAGE, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id })
        return true;
      }

      const languageCode = regexMatch.at(1);

      if (languageCode == "ar")
        settings.setLanguage('ar');
      else
        settings.setLanguage('en');

      sendDiagnosticMessage(DiagnosticMessage.BOT_LANGUAGE_CHANGE_MESSAGE, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id });
    }
    else
      sendDiagnosticMessage(DiagnosticMessage.UNKNOWN_COMMAND, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: msg.message_id });

    return true;
  }

  static handleAdminChatReplyCommands = async function (msg) { // msg must be a reply to another message

    const userCommands = ["delete", "عومر", "ban", "عومر2", "إلغاء عومر2", "unban", "info", "معلومات"];

    if (!msg.text)
      return false;

    const text = msg.text.toLowerCase();

    if (!userCommands.includes(text))
      return false;

    const replyToMessage = msg.reply_to_message;
    const replyToMessageId = replyToMessage.message_id;

    if (text == "delete" || text == "عومر") {

      const message = await messages.getMessage(replyToMessage);

      if (!message) {
        sendDiagnosticMessage(DiagnosticMessage.MESSAGE_NOT_PRESENT_BOT_DATA_STRUCTURES, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: replyToMessageId })
        return true;
      }

      const { userChatId, userMessageId } = message;

      bot.deleteMessage(userChatId, userMessageId);
      sendDiagnosticMessage(DiagnosticMessage.DELETED_MESSAGE, BotInfo.ADMIN_CHAT_ID, { reply_to_message_id: replyToMessageId })

    }
    else if (text == "ban" || text == "عومر2") {

      const message = await CommandHandler.#mapForwardedMessageToUserChatID(replyToMessage);

      if (Object.entries(message).length > 0)
        banChat(message.userChatId, msg.message_id);

    }
    else if (text == "unban" || text == "إلغاء عومر2") {

      const message = await CommandHandler.#mapForwardedMessageToUserChatID(replyToMessage);

      if (Object.entries(message).length > 0)
        unbanChat(message.userChatId, msg.message_id);

    }
    else if (text == "info" || text == "معلومات") {

      const message = await CommandHandler.#mapForwardedMessageToUserChatID(replyToMessage);

      if (Object.entries(message).length == 0)
        return;

      const userChatId = message.userChatId;

      let username;
      let fullName;

      const member = await bot.getChatMember(userChatId, userChatId);
      const user = member.user;
      const isInPrivateMode = await users.isUserPrivate(user);
      const id = user.id;
      const isUserBanned = await users.isUserBanned({ id: chatId });

      if (isInPrivateMode) {
        const userInfo = `
        ✳️ User Information: [User is in private mode]
        🪪 User ID: ${id}
        ⛔ Status: ${isUserBanned ? 'Banned' : 'Not banned'}
        `.trim();

        bot.sendMessage(BotInfo.ADMIN_CHAT_ID, userInfo);
        return true;
      }

      username = UserInfo.getUserNameFromUser(user);
      fullName = UserInfo.getFullNameFromUser(user);

      const photos = await bot.getUserProfilePhotos(userChatId);

      const userInfo = `
          ✳️ User Information:
          👤 Full Name: ${fullName}
          👤 Username: ${username}
          🪪 User ID: ${id}
          ⛔ Status: ${isUserBanned ? 'Banned' : 'Not banned'}
          `.trim();

      if (photos.total_count == 0) {
        const options = {
          reply_to_message_id: msg.message_id,
          entities: [{ type: "mention", offset: userInfo.indexOf(username), length: username.length }]
        }

        bot.sendMessage(BotInfo.ADMIN_CHAT_ID, userInfo, options)
        return true;
      }

      const photo = photos.photos.at(0).at(0);

      bot.sendPhoto(BotInfo.ADMIN_CHAT_ID, photo.file_id, {
        reply_to_message_id: msg.message_id,
        caption: userInfo,
        caption_entities: [{ type: "mention", offset: userInfo.indexOf(username), length: username.length }]
      });

    }

    return true;
  }

  static handleUserChatCommands = async function (msg) {

    const msgText = msg.text || '';
    const userChatId = msg.chat.id;

    if (!msgText)
      return false;

    if (msgText[0] != '/')
      return false;

    const options = {
      reply_to_message_id: msg.message_id
    }

    if (msgText == '/commands')
      sendDiagnosticMessage(DiagnosticMessage.USER_COMMANDS_MESSAGE, userChatId, options);
    else if (msgText == '/start') {
      if (await users.getUser(msg.from.id)) // If the user has already /start ed the chat
        sendDiagnosticMessage(DiagnosticMessage.USER_CHAT_HAS_ALREADY_STARTED, userChatId, options);
      else {
        await users.addUser(msg.from);
        sendDiagnosticMessage(DiagnosticMessage.USER_WELCOMING_MESSAGE, userChatId, options);
      }

      return true;
    }
    else if (msgText.startsWith('/private ')) {
      const regexMatch = /\/private (on|off)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND, userChatId, { reply_to_message_id: msg.message_id, correct_format: '/private on\\|off' });
        return true;
      }

      const res = regexMatch.at(1);

      if (res == 'off') {
        await users.makeUserNonPrivate(msg.from);
        bot.sendMessage(userChatId, "You left private mode.");
      } else {
        await users.makeUserPrivate(msg.from);
        bot.sendMessage(userChatId, "You entered private mode.");
      }

    }
    else
      sendDiagnosticMessage(DiagnosticMessage.UNKNOWN_COMMAND, userChatId, { reply_to_message_id: msg.message_id })

    return true;
  }

}
