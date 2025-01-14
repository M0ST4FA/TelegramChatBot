const TelegramBot = require('node-telegram-bot-api');
const { PrismaClient } = require('@prisma/client');

exports.BOT_NAME = process.env.BOT_NAME;
exports.BOT_TOKEN = process.env.BOT_TOKEN;
exports.bot = new TelegramBot(exports.BOT_TOKEN, { polling: true });
exports.ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Replace with the chat ID you want to forward messages to

exports.prisma = new PrismaClient();

// ADMIN COMMANDS
exports.ADMIN_COMMANDS_MESSAGE_EN =
      `✳️ Commands supported by the bot:
🤖 /commands Shows this message\\.
🤖 /log Prints debugging information for developers\\.
🤖 /init Initializes the bot\\. This must be used the first time the bot is used within an admin chat\\.
🤖 /sign on\\|off Toggles showing the name of the responder from the admin chat to the user\\.
🤖 /replies on\\|off Toggles showing the message that admins have replied to to the user\\.
🤖 /forwarding on\\|off Toggles forwarding user messages or sending them without forwarding\\.
🤖 /bannedUsers Lists all of the banned users\\.
🤖 /ban \\<user ID\\> Bans the user with the ID \\<user ID\\> from the bot\\.
🤖 /unban \\<user ID\\> Removes the user with the ID \\<user ID\\> from the list of banned users\\.
🤖 /language Prints the language of the bot\\.
🤖 /language ar\\|en Sets the language of the bot to Arabic \\(ar\\) or English \\(en\\)\\.`

exports.ADMIN_COMMANDS_MESSAGE_AR =
      `✳️ الأوامر المدعومة من البوت:
🤖 /commands 
عرض هذه الرسالة\\.
🤖 /log 
طباعة معلومات التصحيح للمطورين\\.
🤖 /init
تهيئة البوت\\. هذا الأمر يجب أن يستخدم في شات المشرفين في المرة الأولي التي يتم فيها استخدام البوت\\.
🤖 /sign on\\|off 
تشغيل أو إيقاف توقيع رسائل المشرف\\.
🤖 /replies on\\|off 
تشغيل أو إيقاف إظهار الرسالة التي قام المشرفون بالرد عليها للمستخدم\\.
🤖 /forwarding on\\|off 
تشغيل أو إيقاف إعادة توجيه رسائل المستخدمين أو إرسالها بدون إعادة توجيه\\.
🤖 /bannedUsers
عرض جميع المستخدمين المحظورين\\.
🤖 /ban \\<user ID\\>
حظر المستخدم الذي يمتلك معرف المستخدم المحدد\\.
🤖 /unban \\<user ID\\>
إزالة المستخدم الذي يمتلك معرف المستخدم المحدد من قائمة المحظورين\\.
🤖 /language
عرض لغة البوت\\.
🤖 /language ar\\|en
تحويل لغة البوت إلي العربية \\(ar\\) أو الإنجليزية \\(en\\)\\.`;

// USER COMMANDS
exports.USER_COMMANDS_MESSAGE_EN =
      `✳️ Commands supported by the bot:
🤖 /commands Shows this message\\.
🤖 /private on\\|off Toggles private mode\\. In private mode, your name and information is not available to the admins of the bot\\.`

exports.USER_COMMANDS_MESSAGE_AR =
      `✳️ الأوامر المدعومة من البوت:
🤖 /commands
عرض هذه الرسالة\\.
🤖 /private on\\|off
تشغيل أو إيقاف الوضع الخاص\\. في هذا الوضع, اسمك و معلومات حسابك لا تظهر للمشرفين\\.`;

// WELCOMING MESSAGE
exports.USER_WELCOMING_MESSAGE_EN =
      `✳️ Welcome to ${exports.BOT_NAME}\\!
✳️ You can send us any message you want and hopefully we will respond ASAP\\. 
✳️ Please be patient, and most importantly, be polite\\.
${exports.USER_COMMANDS_MESSAGE_EN}`

exports.USER_WELCOMING_MESSAGE_AR =
      `✳️ مرحبا بك في ${exports.BOT_NAME}\\!
✳️ بإمكانك إرسال أية رسالة تريدها و سنحاول الرد عليك بأسرع ما يمكن\\. 
✳️ من فضلك كن صبورًا, و الأهم, كن محترمًا\\.
${exports.USER_COMMANDS_MESSAGE_AR}`;