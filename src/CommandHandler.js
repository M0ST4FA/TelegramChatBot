import { BotInfo, TextMessages, bot, prisma } from './constants.js';
import { UserInfo, messages } from './common.js';
import { settings, users, admins } from './settings.js';
import {
  sendDiagnosticMessage,
  DiagnosticMessage,
  Diagnostics,
} from './diagnostics.js';

const banChat = async function (chatId, banMsgId) {
  const options = {
    reply_to_message_id: banMsgId,
    user: { id: chatId }, // Fill it for the first call
  };

  // If user is already banned
  if (await users.isUserBanned({ id: chatId })) {
    sendDiagnosticMessage(
      DiagnosticMessage.USER_IS_ALREADY_BANNED,
      BotInfo.ADMIN_CHAT_ID,
      options,
    );
    return true;
  }

  const resArray = await Promise.allSettled([
    // Add the user to the list of banned users
    users.banUser({ id: chatId }),
    // Send diagnostic message to the user
    sendDiagnosticMessage(DiagnosticMessage.USER_BANNING_MESSAGE, chatId),
    // Get user from chat
    bot.getChatMember(chatId, chatId),
  ]);

  // Send diagnostic message to admin chat
  const chatMember = resArray[2].value;
  const user = chatMember.user;
  options.user = user;
  sendDiagnosticMessage(
    DiagnosticMessage.ADMIN_BANNING_MESSAGE,
    BotInfo.ADMIN_CHAT_ID,
    options,
  );
  return true;
};

const unbanChat = async function (chatId, unbanMsgId) {
  const options = {
    reply_to_message_id: unbanMsgId,
    user: { id: chatId }, // Fill it for the first call
  };

  // If user is already not banned
  if (!(await users.isUserBanned({ id: chatId }))) {
    sendDiagnosticMessage(
      DiagnosticMessage.USER_IS_ALREADY_NOT_BANNED,
      BotInfo.ADMIN_CHAT_ID,
      options,
    );
    return true;
  }

  const resArray = await Promise.allSettled([
    // Remove the user from the list of banned users
    users.unbanUser({ id: chatId }),
    // Inform the user that they have been removed from the list of banned users
    sendDiagnosticMessage(
      DiagnosticMessage.USER_NO_LONGER_BANNED_MESSAGE,
      chatId,
    ),
    bot.getChatMember(chatId, chatId),
  ]);

  // Inform the admin chat that the user has been removed from the list of banned users
  const chatMember = resArray[2].value;
  const user = chatMember.user;
  options.user = user;
  sendDiagnosticMessage(
    DiagnosticMessage.ADMIN_USER_NO_LONGER_BANNED_MESSAGE,
    BotInfo.ADMIN_CHAT_ID,
    options,
  );

  return true;
};

const initializeBot = async function (cmdMsg) {
  const initializedObj = await prisma.setting.findUnique({
    where: {
      key: 'initialized',
    },
  });

  const initialized = initializedObj ? initializedObj.value : false;

  if (initialized) {
    sendDiagnosticMessage(
      DiagnosticMessage.BOT_IS_ALREADY_INITIALIZED_MESSAGE,
      BotInfo.ADMIN_CHAT_ID,
      {
        reply_to_message_id: cmdMsg.message_id,
      },
    );
    return true;
  }

  const settings = [
    { key: 'replies', value: JSON.stringify(true) },
    { key: 'forwardMode', value: JSON.stringify(false) },
    { key: 'language', value: JSON.stringify('ar') },
    { key: 'initialized', value: JSON.stringify(true) },
  ];

  const settingPromiseArr = [
    bot.setMyCommands(Diagnostics.adminCommands(), {
      scope: { type: 'all_group_chats' },
    }),
    bot.setMyCommands(Diagnostics.userCommands(), {
      scope: { type: 'all_private_chats' },
    }),
  ];

  for (const setting of settings)
    settingPromiseArr.push(
      prisma.setting.create({
        data: { key: setting.key, value: setting.value },
      }),
    );

  await Promise.all(settingPromiseArr);

  sendDiagnosticMessage(
    DiagnosticMessage.ADMIN_INIT_BOT_MESSAGE,
    BotInfo.ADMIN_CHAT_ID,
    {
      reply_to_message_id: cmdMsg.message_id,
    },
  );

  return true;
};
export default class CommandHandler {
  static getMainMenuKeyboardButton() {
    const language = settings.language();

    if (language == 'ar')
      return [
        {
          text: '↩️ العودة إلي القائمة الرئيسية',
          callback_data: 'move_to_main_menu',
        },
      ];
    else
      return [
        { text: '↪️ Back to Main Menu', callback_data: 'move_to_main_menu' },
      ];
  }

  static getLanguageMenuKeyboard() {
    const language = settings.language();

    const keyboard = [
      language === 'ar'
        ? [
            {
              text: '\uD83C\uDDFA\uD83C\uDDF8 English',
              callback_data: 'set_language_english',
            },
          ]
        : [
            {
              text: '\uD83C\uDDF8\uD83C\uDDE6 عربي',
              callback_data: 'set_language_arabic',
            },
          ],

      CommandHandler.getMainMenuKeyboardButton(),
    ];

    return keyboard;
  }

  static async getBannedUsersKeyboard() {
    const keyboard = [];
    const bndChatIds = await users.getBannedUserIds();
    const promises = [];

    for (const chatId of bndChatIds) {
      const promise = bot
        .getChatMember(chatId, chatId)
        .then(member => member.user);

      promises.push(promise);
    }

    const bannedUsers = await Promise.all(promises);

    for (const user of bannedUsers) {
      const userId = user.id;

      if (await users.isUserPrivate(user))
        keyboard.push([
          {
            text: `🔒 ID: ${userId} [User is in private mode]`,
            callback_data: `unban_user_${userId}`,
          },
        ]);
      else {
        const username = UserInfo.getUserNameFromUser(user);
        const fullName = UserInfo.getFullNameFromUser(user);
        const msg = `🔒 ${fullName} (${username}:${userId})`;

        keyboard.push([{ text: msg, callback_data: `unban_user_${userId}` }]);
      }
    }

    keyboard.push(CommandHandler.getMainMenuKeyboardButton());

    return keyboard;
  }

  static async getAdminSettingsKeyboard(user) {
    const resArray = await Promise.all([admins.adminSigns(user)]);

    const adminSigns = resArray[0];
    const forwarding = settings.forwardMode();
    const replies = settings.replies();
    const language = settings.language();

    let signingButtonText = '';
    let forwardingButtonText = '';
    let repliesButtonText = '';
    let languageButtonText = '';
    let manageBannedUsersButtonText = '';
    let statisticsButtonText = '';
    let finishButtonText = '';

    if (language == 'ar') {
      signingButtonText = `✒️ توقيع رسائل المشرف ${UserInfo.getUserNameFromUser(
        user,
      )}: ${adminSigns ? 'موقعة' : 'غير موقعة'}`;
      forwardingButtonText = `⏪ وضع توجيه الرسائل: ${
        forwarding ? 'مُشغَّل' : 'مُعطَّل'
      }`;
      repliesButtonText = `🔎 إظهار الردود للمستخدم: ${
        replies ? 'مُشغَّل' : 'مُعطَّل'
      }`;
      languageButtonText = `🌍 لغة البوت: ${
        language == 'ar' ? 'اللغة العربية' : 'اللغة الإنجليزية'
      }`;
      manageBannedUsersButtonText = '🔐 إدارة المستخدمين المحظورين';
      statisticsButtonText = '📊 الإحصائيات';
      finishButtonText = '✅ إنهاء';
    } else {
      signingButtonText = `✒️ Message Signing for Admin ${UserInfo.getUserNameFromUser(
        user,
      )}: ${adminSigns ? 'On' : 'Off'}`;
      forwardingButtonText = `⏩ Forwarding Mode: ${forwarding ? 'On' : 'Off'}`;
      repliesButtonText = `🔍 Show Replies: ${replies ? 'On' : 'Off'}`;
      languageButtonText = `🌎 Bot Language: ${
        language == 'ar' ? 'Arabic' : 'English'
      }`;
      manageBannedUsersButtonText = '🔐 Manage Banned Users';
      statisticsButtonText = '📊 Statistics';
      finishButtonText = '✅ Done';
    }

    const keyboard = [
      [{ text: signingButtonText, callback_data: 'toggle_sign_messages' }],
      [{ text: forwardingButtonText, callback_data: 'toggle_forwarding' }],
      [{ text: repliesButtonText, callback_data: 'toggle_replies' }],
      [{ text: languageButtonText, callback_data: 'change_language' }],
      [
        {
          text: manageBannedUsersButtonText,
          callback_data: 'manage_banned_users',
        },
      ],
      [{ text: statisticsButtonText, callback_data: 'statistics' }],
      [
        {
          text: finishButtonText,
          callback_data: 'finish_editing_admin_settings',
        },
      ],
    ];

    return keyboard;
  }

  static async getActiveChannelKeyboard() {}

  static async getUserSettingsKeyboard(user) {
    const resArray = await Promise.all([users.isUserPrivate(user)]);

    const language = settings.language();
    const userIsPrivate = resArray[0];

    let pirvateButtonText = '';
    let activeChannelButtonText = '';

    if (language == 'ar') {
      pirvateButtonText = `🔐 الوضع الخاص (البرايفت): ${Diagnostics.boolMessage(
        userIsPrivate,
      )}`;
      // activeChannelButtonText = `📬 القناة التي يتم إرسال الرسائل إليها: ${Diagnostics.boolMessage(userIsPrivate)}`;
    } else {
      pirvateButtonText = `🔐 Private Mode: ${Diagnostics.boolMessage(
        userIsPrivate,
      )}`;
      // activeChannelButtonText = `📬 Active Channel: ${Diagnostics.boolMessage(userIsPrivate)}`;
    }

    const keyboard = [
      [{ text: pirvateButtonText, callback_data: 'toggle_private_mode' }],
      // [{ text: activeChannelButtonText, callback_data: 'change_active_channel' }],
      [
        {
          text: Diagnostics.finishMessage(),
          callback_data: 'finish_editing_user_settings',
        },
      ],
    ];

    return keyboard;
  }

  static async #mapForwardedMessageToUserChatID(adminMsg) {
    const userMessage = await messages.getUserMessageA(adminMsg.message_id);

    if (!userMessage) {
      sendDiagnosticMessage(
        DiagnosticMessage.MESSAGE_NOT_PRESENT_BOT_DATA_STRUCTURES,
        BotInfo.ADMIN_CHAT_ID,
        { reply_to_message_id: adminMsg.message_id },
      );
      return null;
    }

    return userMessage;
  }

  static handleAdminChatCommands = async function (msg) {
    const msgText = msg.text || '';

    if (!msgText) return false;

    if (msgText[0] != '/') return false;

    if (msgText == `/help@${BotInfo.BOT_USERNAME}`)
      sendDiagnosticMessage(
        DiagnosticMessage.ADMIN_COMMANDS_MESSAGE,
        BotInfo.ADMIN_CHAT_ID,
        { reply_to_message_id: msg.message_id },
      );
    else if (msgText == `/log@${BotInfo.BOT_USERNAME}`) {
      bot.sendMessage(BotInfo.ADMIN_CHAT_ID, `Reimplement this command.`);
      return true;
    } else if (msgText == `/start@${BotInfo.BOT_USERNAME}`)
      await initializeBot(msg);
    else if (msgText == `/settings@${BotInfo.BOT_USERNAME}`) {
      const keyboard = await CommandHandler.getAdminSettingsKeyboard(msg.from);
      bot.sendMessage(BotInfo.ADMIN_CHAT_ID, Diagnostics.settingsMessage(), {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } else if (msgText.startsWith(`/sign@${BotInfo.BOT_USERNAME}`)) {
      if (msgText == `/sign@${BotInfo.BOT_USERNAME}`) {
        sendDiagnosticMessage(
          DiagnosticMessage.ADMIN_SIGN_STATE_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          { reply_to_message_id: msg.message_id, user: msg.from },
        );
        return true;
      }

      const regexMatch = /\/sign@.+ (on|off)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(
          DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND,
          BotInfo.ADMIN_CHAT_ID,
          {
            reply_to_message_id: msg.message_id,
            correct_format: '/sign on\\|off\\|',
          },
        );
        return true;
      }

      const res = regexMatch.at(1);

      const options = {
        reply_to_message_id: msg.message_id,
        user: msg.from,
      };

      if (res == 'off') {
        await admins.disableSigning(msg.from);
        sendDiagnosticMessage(
          DiagnosticMessage.USER_MESSAGES_WILL_NOT_BE_SIGNED_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          options,
        );
      } else {
        await admins.enableSigning(msg.from);
        sendDiagnosticMessage(
          DiagnosticMessage.USER_MESSAGES_WILL_BE_SIGNED_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          options,
        );
      }
    } else if (msgText.startsWith(`/replies@${BotInfo.BOT_USERNAME}`)) {
      if (msgText == `/replies@${BotInfo.BOT_USERNAME}`) {
        sendDiagnosticMessage(
          DiagnosticMessage.BOT_REPLIES_SETTING_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          { reply_to_message_id: msg.message_id },
        );
        return true;
      }

      const regexMatch = /\/replies@.+ (on|off)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(
          DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND,
          BotInfo.ADMIN_CHAT_ID,
          {
            reply_to_message_id: msg.message_id,
            correct_format: '/replies on\\|off',
          },
        );
        return true;
      }

      const res = regexMatch.at(1);

      const options = {
        replied_to_message_id: msg.message_id,
      };

      if (res == 'off') {
        await settings.setReplies(off);
        sendDiagnosticMessage(
          DiagnosticMessage.HIDE_REPLIED_TO_MESSAGES_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          options,
        );
      } else {
        await settings.setReplies(on);
        sendDiagnosticMessage(
          DiagnosticMessage.SHOW_REPLIED_TO_MESSAGES_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          options,
        );
      }
    } else if (msgText.startsWith(`/forwarding@${BotInfo.BOT_USERNAME}`)) {
      if (msgText == `/forwarding@${BotInfo.BOT_USERNAME}`) {
        sendDiagnosticMessage(
          DiagnosticMessage.BOT_FORWARDING_SETTING_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          { reply_to_message_id: msg.message_id },
        );
        return true;
      }

      const regexMatch = /\/forwarding@.+ (on|off)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(
          DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND,
          BotInfo.ADMIN_CHAT_ID,
          {
            reply_to_message_id: msg.message_id,
            correct_format: '/forwarding on\\|off',
          },
        );
        return true;
      }

      const res = regexMatch.at(1);

      const options = {
        reply_to_message_id: msg.message_id,
      };

      if (res == 'off') {
        await settings.setForwardMode(false);
        sendDiagnosticMessage(
          DiagnosticMessage.FORWARDING_IS_OFF_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          options,
        );
      } else {
        await settings.setForwardMode(true);
        sendDiagnosticMessage(
          DiagnosticMessage.FORWARDING_IS_ON_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          options,
        );
      }
    } else if (msgText == `/bannedusers@${BotInfo.BOT_USERNAME}`) {
      const bndChatIds = await users.getBannedUserIds();

      if (bndChatIds.length == 0) {
        sendDiagnosticMessage(
          DiagnosticMessage.NO_BANNED_USERS_EXIST,
          BotInfo.ADMIN_CHAT_ID,
          { reply_to_message_id: msg.message_id },
        );
        return true;
      }

      await sendDiagnosticMessage(
        DiagnosticMessage.DISPLAYING_BANNED_USERS_NOW,
        BotInfo.ADMIN_CHAT_ID,
        { reply_to_message_id: msg.message_id },
      );
      for (const chatId of bndChatIds) {
        bot.getChatMember(chatId, chatId).then(async member => {
          const user = member.user;

          if (await users.isUserPrivate(user)) {
            bot.sendMessage(
              BotInfo.ADMIN_CHAT_ID,
              `${user.id} [User is in private mode]`,
            );
            return;
          }

          const username = UserInfo.getUserNameFromUser(user);
          const fullName = UserInfo.getFullNameFromUser(user);
          const msg = `${fullName} (${username}:${chatId})`;

          bot.sendMessage(BotInfo.ADMIN_CHAT_ID, msg, {
            entities: [
              {
                type: 'mention',
                offset: msg.indexOf(username),
                length: username.length,
              },
            ],
          });
        });
      }
    } else if (msgText.startsWith(`/ban@${BotInfo.BOT_USERNAME} `)) {
      const regexMatch = /\/ban@.+ (\d{8,})/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(
          DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND,
          BotInfo.ADMIN_CHAT_ID,
          {
            reply_to_message_id: msg.message_id,
            correct_format: '/ban <user ID>',
          },
        );
        return true;
      }

      const chatId = +regexMatch.at(1);
      banChat(chatId, msg.message_id);
    } else if (msgText.startsWith(`/unban@${BotInfo.BOT_USERNAME} `)) {
      const regexMatch = /\/unban@.+ (\d{8,})/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(
          DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND,
          BotInfo.ADMIN_CHAT_ID,
          {
            reply_to_message_id: msg.message_id,
            correct_format: '/unban <user ID>',
          },
        );
        return true;
      }

      const chatId = +regexMatch.at(1);
      unbanChat(chatId, msg.message_id);
    } else if (msgText.startsWith(`/language@${BotInfo.BOT_USERNAME}`)) {
      if (msgText == `/language@${BotInfo.BOT_USERNAME}`) {
        sendDiagnosticMessage(
          DiagnosticMessage.BOT_LANGUAGE_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          { reply_to_message_id: msg.message_id },
        );
        return true;
      }

      const regexMatch = /\/language@.+ (ar|en)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(
          DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND,
          BotInfo.ADMIN_CHAT_ID,
          {
            reply_to_message_id: msg.message_id,
            correct_format: '/language ar\\|en\\|',
          },
        );
        return true;
      }

      const languageCode = regexMatch.at(1);

      if (languageCode == 'ar') settings.setLanguage('ar');
      else settings.setLanguage('en');

      sendDiagnosticMessage(
        DiagnosticMessage.BOT_LANGUAGE_CHANGE_MESSAGE,
        BotInfo.ADMIN_CHAT_ID,
        { reply_to_message_id: msg.message_id },
      );
    } else
      sendDiagnosticMessage(
        DiagnosticMessage.UNKNOWN_COMMAND,
        BotInfo.ADMIN_CHAT_ID,
        { reply_to_message_id: msg.message_id },
      );

    return true;
  };

  static handleAdminChatReplyCommands = async function (msg) {
    // msg must be a reply to another message

    const userCommands = [
      'delete',
      'عومر',
      'ban',
      'عومر2',
      'إلغاء عومر2',
      'unban',
      'info',
      'معلومات',
    ];

    if (!msg.text) return false;

    const text = msg.text.toLowerCase();

    if (!userCommands.includes(text)) return false;

    const replyToMessage = msg?.reply_to_message;
    const replyToMessageId = replyToMessage?.message_id;

    if (text == 'delete' || text == 'عومر') {
      const message = await messages.getMessage(replyToMessage);

      if (!message) {
        sendDiagnosticMessage(
          DiagnosticMessage.MESSAGE_NOT_PRESENT_BOT_DATA_STRUCTURES,
          BotInfo.ADMIN_CHAT_ID,
          { reply_to_message_id: replyToMessageId },
        );
        return true;
      }

      if (message.forwarded) {
        sendDiagnosticMessage(
          DiagnosticMessage.ADMIN_DELETING_WRONG_MESSAGE,
          chatId,
          { reply_to_message_id: replyToMessageId },
        );
        return true;
      }

      await Promise.allSettled([
        messages.deleteMessage(message),
        sendDiagnosticMessage(
          DiagnosticMessage.DELETED_MESSAGE,
          BotInfo.ADMIN_CHAT_ID,
          { reply_to_message_id: replyToMessageId },
        ),
      ]);
    } else if (text == 'ban' || text == 'عومر2') {
      const message = await CommandHandler.#mapForwardedMessageToUserChatID(
        replyToMessage,
      );

      if (message) banChat(message.userChatId, msg.message_id);
    } else if (text == 'unban' || text == 'إلغاء عومر2') {
      const message = await CommandHandler.#mapForwardedMessageToUserChatID(
        replyToMessage,
      );

      if (message) unbanChat(message.userChatId, msg.message_id);
    } else if (text == 'info' || text == 'معلومات') {
      const message = await CommandHandler.#mapForwardedMessageToUserChatID(
        replyToMessage,
      );

      if (!message) return;

      const userChatId = message.userChatId;

      let username;
      let fullName;

      const resArray = await Promise.allSettled([
        bot.getChatMember(userChatId, userChatId),
        bot.getUserProfilePhotos(userChatId),
      ]);

      const botSenderMsg = BotInfo.BOT_NAME;
      const getEntities = function (msg) {
        return {
          entities: [
            {
              type: 'blockquote',
              offset: msg.lastIndexOf(botSenderMsg),
              length: botSenderMsg.length,
            },
          ],
        };
      };

      const id = userChatId;
      const member = resArray[0].value;
      const user = member.user;
      const userObj = await users.getUser(userChatId);
      const isInPrivateMode = userObj.private;
      const isUserBanned = userObj.banned;

      if (isInPrivateMode) {
        const userInfo = `
        ✳️ User Information: [User is in private mode]
        🪪 User ID: ${id}
        ⛔ Status: ${isUserBanned ? 'Banned' : 'Not banned'}${botSenderMsg}
        `.trim();

        const entities = getEntities(userInfo);

        bot.sendMessage(BotInfo.ADMIN_CHAT_ID, userInfo, {
          reply_to_message_id: msg.message_id,
          ...entities.entities,
        });
        return true;
      }

      username = UserInfo.getUserNameFromUser(user);
      fullName = UserInfo.getFullNameFromUser(user);

      const photos = resArray[1].value;

      const userInfo = `
          ✳️ User Information:
          👤 Full Name: ${fullName}
          👤 Username: ${username}
          🪪 User ID: ${id}
          ⛔ Status: ${isUserBanned ? 'Banned' : 'Not banned'}${botSenderMsg}
          `.trim();

      const entities = getEntities(userInfo);
      console.log(entities);

      if (photos.total_count == 0) {
        const options = {
          reply_to_message_id: msg.message_id,
          entities: [
            {
              type: 'mention',
              offset: userInfo.indexOf(username),
              length: username.length,
            },
            ...entities.entities,
          ],
        };

        bot.sendMessage(BotInfo.ADMIN_CHAT_ID, userInfo, options);
        return true;
      }

      const photo = photos.photos.at(0).at(0);

      bot.sendPhoto(BotInfo.ADMIN_CHAT_ID, photo.file_id, {
        reply_to_message_id: msg.message_id,
        caption: userInfo,
        caption_entities: [
          {
            type: 'mention',
            offset: userInfo.indexOf(username),
            length: username.length,
          },
          ...entities.entities,
        ],
      });
    }

    return true;
  };

  static handleUserChatCommands = async function (msg) {
    const msgText = msg.text || '';
    const userChatId = msg.chat.id;

    if (!msgText) return false;

    if (msgText[0] != '/') return false;

    const options = {
      reply_to_message_id: msg.message_id,
      user: msg.from,
    };

    if (msgText == '/start') {
      if (await users.getUser(msg.from.id))
        // If the user has already /start ed the chat
        sendDiagnosticMessage(
          DiagnosticMessage.USER_CHAT_HAS_ALREADY_STARTED,
          userChatId,
          options,
        );
      else
        await Promise.allSettled([
          users.addUser(msg.from, { banned: false, privateMode: false }),
          sendDiagnosticMessage(
            DiagnosticMessage.USER_WELCOMING_MESSAGE,
            userChatId,
            options,
          ),
        ]);

      return true;
    } else if (msgText == '/help')
      sendDiagnosticMessage(
        DiagnosticMessage.USER_COMMANDS_MESSAGE,
        userChatId,
        options,
      );
    else if (msgText == '/settings') {
      const keyboard = await CommandHandler.getUserSettingsKeyboard(msg.from);
      bot.sendMessage(userChatId, Diagnostics.settingsMessage(), {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } else if (msgText.startsWith('/private')) {
      // Show the private mode state of the user
      if (msgText == '/private') {
        sendDiagnosticMessage(
          DiagnosticMessage.USER_PRIVATE_STATE_MESSAGE,
          userChatId,
          options,
        );
        return true;
      }

      const regexMatch = /\/private (on|off)/.exec(msgText);

      if (!regexMatch) {
        sendDiagnosticMessage(
          DiagnosticMessage.INCORRECT_FORMAT_OF_COMMAND,
          userChatId,
          {
            reply_to_message_id: msg.message_id,
            correct_format: '/private on\\|off',
          },
        );
        return true;
      }

      const res = regexMatch.at(1);

      if (res == 'off')
        await Promise.allSettled([
          users.makeUserNonPrivate(msg.from),
          sendDiagnosticMessage(
            DiagnosticMessage.USER_PRIVATE_MODE_CHANGED_MESSAGE,
            userChatId,
            options,
          ),
        ]);
      else
        await Promise.allSettled([
          await users.makeUserPrivate(msg.from),
          sendDiagnosticMessage(
            DiagnosticMessage.USER_PRIVATE_MODE_CHANGED_MESSAGE,
            userChatId,
            options,
          ),
        ]);
    } else
      sendDiagnosticMessage(DiagnosticMessage.UNKNOWN_COMMAND, userChatId, {
        reply_to_message_id: msg.message_id,
      });

    return true;
  };

  static handleUserChatReplyCommands = async function (msg) {
    // msg must be a reply to another message

    const userCommands = ['delete', 'عومر'];

    if (!msg.text) return false;

    const text = msg.text.toLowerCase();

    if (!userCommands.includes(text)) return false;

    const chatId = msg.chat.id;
    const replyToMessage = msg?.reply_to_message;
    const replyToMessageId = replyToMessage?.message_id;

    if (text == 'delete' || text == 'عومر') {
      const message = await messages.getMessage(replyToMessage);

      if (!message) {
        sendDiagnosticMessage(
          DiagnosticMessage.MESSAGE_NOT_PRESENT_BOT_DATA_STRUCTURES,
          chatId,
          { reply_to_message_id: replyToMessageId },
        );
        return true;
      }

      if (!message.forwarded) {
        sendDiagnosticMessage(
          DiagnosticMessage.USER_DELETING_WRONG_MESSAGE,
          chatId,
          { reply_to_message_id: replyToMessageId },
        );
        return true;
      }

      await Promise.allSettled([
        messages.deleteMessage(message),
        sendDiagnosticMessage(DiagnosticMessage.DELETED_MESSAGE, chatId, {
          reply_to_message_id: replyToMessageId,
        }),
      ]);
    }

    return true;
  };
}
