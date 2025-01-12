const { TOKEN } = require('./constants.js');
const TelegramBot = require('node-telegram-bot-api');
const { showResponderName } = require('./settings.js')

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
  return `@${user.username}`;
}

exports.getFullNameFromUser = function (user) {
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';

  let fullName = `${firstName} ${lastName}`;
  fullName = fullName.trimEnd();

  if (fullName == 'عمر عبدالعليم') {
    fullName = 'عومر عبعليم آل دحيح'
  }

  return fullName;
}

exports.getResponderMessage = function (msg) {

  let responderMsg = '';

  if (showResponderName()) {
    let fullName = exports.getFullNameFromUser(msg.from);
    responderMsg = `تم الرد بواسطة: ${fullName}`
  }

  return responderMsg;
}

exports.getSenderMessage = function (msg) {

  const fullName = exports.getFullNameFromUser(msg.from);
  const username = exports.getUserNameFromUser(msg.from);
  const senderMsg = `تم الإرسال بواسطة: ${fullName} (${username})`

  return senderMsg;
}