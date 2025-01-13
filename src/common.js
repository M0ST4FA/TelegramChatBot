const TelegramBot = require('node-telegram-bot-api');
const { ADMIN_CHAT_ID, TOKEN } = require('./constants.js');
const { addToBannedChats, isChatBanned, removeFromBannedChats, isUserPrivate, doesUserSign } = require('./settings.js')

exports.bot = new TelegramBot(TOKEN, { polling: true });
exports.forwardedMessagesA2U = new Map();
exports.adminRepliesMessagesA2U = new Map();
exports.userMessagesU2A = new Map();

exports.setUserMessagesU2A = function (chatId, userMsgId, adminMsgId) {
  let userMap = exports.userMessagesU2A.get(chatId);

  if (!userMap)
    exports.userMessagesU2A.set(chatId, new Map([[userMsgId, adminMsgId]]));
  else
    userMap.set(userMsgId, adminMsgId);

}

exports.getUserNameFromUser = function (user) {
  return user.username ? `@${user.username}` : '@';
}

exports.getFullNameFromUser = function (user) {
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';

  let fullName = `${firstName} ${lastName}`.trim();

  if (fullName == 'عمر عبدالعليم') {
    fullName = 'عومر عبعليم آل دحيح'
  }

  return fullName;
}

exports.getResponderMessage = function (msg, markdown = true) {

  let responderMsg = '';

  if (!doesUserSign(msg.from))
    return responderMsg;

  const fullName = exports.getFullNameFromUser(msg.from);

  if (markdown)
    responderMsg = `>${fullName}`;
  else
    responderMsg = `${fullName}`;

  return responderMsg;
}

exports.getSenderMessage = function (msg, markdown = true) {

  const fullName = exports.getFullNameFromUser(msg.from);
  const username = exports.getUserNameFromUser(msg.from);
  const userId = msg.from.id;
  let senderMsg = '';

  if (markdown)
    senderMsg = `>${fullName} \\([${username}](tg://user?id=${userId}):${userId}\\)`
  else
    senderMsg = `${fullName} (${username}:${userId})`;

  return senderMsg;
}

exports.banChat = async function (chatId) {

  if (isChatBanned(chatId)) {
    exports.bot.sendMessage(ADMIN_CHAT_ID, `User is already banned. To unban user, type /unban ${chatId}.`);
    return;
  }

  const chatMember = await exports.bot.getChatMember(chatId, chatId);
  const user = chatMember.user;
  const username = exports.getUserNameFromUser(user);
  const userFullName = exports.getFullNameFromUser(user);

  addToBannedChats(chatId);
  exports.bot.sendMessage(chatId, "You've been banned from the bot.");

  if (isUserPrivate(user))
    exports.bot.sendMessage(ADMIN_CHAT_ID, `The user with ID ${chatId} has been banned from the bot.`);
  else
    exports.bot.sendMessage(ADMIN_CHAT_ID, `${userFullName} (${username}:${chatId}) has been banned from the bot.`);
}

exports.unbanChat = async function (chatId) {
  if (!isChatBanned(chatId)) {
    exports.bot.sendMessage(ADMIN_CHAT_ID, `User is already not banned. To ban user, type /ban ${chatId}.`);
    return;
  }

  const chatMember = await exports.bot.getChatMember(chatId, chatId);
  const user = chatMember.user;
  const username = exports.getUserNameFromUser(user);
  const userFullName = exports.getFullNameFromUser(user);

  removeFromBannedChats(chatId);
  exports.bot.sendMessage(chatId, "You're no longer banned from the bot.");

  if (isUserPrivate(user))
    exports.bot.sendMessage(ADMIN_CHAT_ID, `The user with ID ${chatId} has been removed from the banned list.`);
  else
    exports.bot.sendMessage(ADMIN_CHAT_ID, `${userFullName} (${username}:${chatId}) has been removed from the banned list.`);

}