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
exports.getResponderMessage = function (msg) {

  let firstName = '';
  let lastName = '';
  let fullName = '';
  let responderMsg = '';

  if (showResponderName()) {
    firstName = msg.from.first_name || '';
    lastName = msg.from.last_name || '';
    fullName = `${firstName} ${lastName}`;

    if (fullName == 'عمر عبدالعليم') {
      fullName = 'عومر عبعليم آل دحيح'
    }

    responderMsg = `تم الرد بواسطة: ${fullName}`
  }

  return responderMsg;
}