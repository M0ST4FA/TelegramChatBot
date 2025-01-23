import { prisma, BotInfo, bot } from './constants.js';
import { users, admins } from './settings.js'
import QuickLRU from 'quick-lru';

class Messages {

  static #onEvection(key, value) {
    Messages.#instance.#keyMappingA2U.delete(value.adminMessageId);
  }

  #messages = new QuickLRU({ maxSize: 3000, onEviction: Messages.#onEvection });
  #keyMappingA2U = new Map();

  constructor() {

  }

  static async #init() {

  }

  async addMessage(userChatId, userMsgId, adminMsgId, forwarded = true) {
    const sUserChatId = BigInt(userChatId)
    const sUserMessageId = BigInt(userMsgId)
    const sAdminMessageId = BigInt(adminMsgId)

    const data = {
      userChatId: sUserChatId,
      userMessageId: sUserMessageId,
      adminMessageId: sAdminMessageId,
      forwarded
    }

    await prisma.message.create({
      data
    })

    this.#messages.set(data.userMessageId, data);
    this.#keyMappingA2U.set(data.adminMessageId, data.userMessageId);
    return data;
  }

  async deleteMessage(message) {

    const userMessageId = message.userMessageId;
    this.#messages.delete(userMessageId);

    async function deleteMsgFromPrisma(userMessageId) {
      return await prisma.message.delete({
        where: {
          userMessageId
        }
      })
    }

    async function deleteMsgFromBot(message) {
      if (message.forwarded)
        return await bot.deleteMessage(BotInfo.ADMIN_CHAT_ID, message.adminMessageId)
      else
        return await bot.deleteMessage(message.userChatId, message.userMessageId);
    }

    return await Promise.allSettled([
      deleteMsgFromBot(message),
      deleteMsgFromPrisma(userMessageId)
    ]);
  }

  async addUserMessage(userChatId, userMsgId, adminMsgId) {
    return await this.addMessage(userChatId, userMsgId, adminMsgId, true);
  }

  async addAdminMessage(userChatId, userMsgId, adminMsgId) {
    return await this.addMessage(userChatId, userMsgId, adminMsgId, false);
  }

  async getMessage(msg) {
    const sMessageId = BigInt(msg.message_id);
    const chatId = msg.chat.id;
    let message;

    // Try to get the message from the cache
    if (chatId == BotInfo.ADMIN_CHAT_ID) {
      const userId = this.#keyMappingA2U.get(sMessageId);

      if (userId)
        message = this.#messages.get(userId);
    } else
      message = this.#messages.get(sMessageId);

    // If you found a message, that's a cache hit; return that message
    if (message)
      return message;

    // If you didn't find a message, that's a cache miss; load that message
    if (chatId == BotInfo.ADMIN_CHAT_ID)
      message = await prisma.message.findUnique({
        where: {
          adminMessageId: sMessageId
        }
      })
    else
      message = await prisma.message.findUnique({
        where: {
          userMessageId: sMessageId
        }
      })

    if (!message) {
      console.warn(`Couldn't find message with message id ${sMessageId} (chat id: ${chatId}) in database. Likely it is not a message related to the bot.`);
      return null;
    }

    // Add the message to the cache
    this.#messages.set(message.userMessageId, message);
    this.#keyMappingA2U.set(message.adminMessageId, message.userMessageId);
    return message;
  }

  async isMessageSentByUser(msg) {
    let message;

    if (msg.chat.id == BotInfo.ADMIN_CHAT_ID)
      message = await this.getUserMessageA(msg.message_id);
    else
      message = await this.getUserMessageU(msg.message_id);

    return !message ? false : message.forwarded;
  }

  async isMessageSentByAdmin(msg) {
    return !(await this.isMessageSentByUser(msg));
  }

  async getUserMessageA(adminMessageId) {

    if (!adminMessageId)
      return null;

    const biAdminMessageId = BigInt(adminMessageId);

    let message;

    const userMessageId = this.#keyMappingA2U.get(biAdminMessageId);

    if (userMessageId)
      message = this.#messages.get(userMessageId);

    if (message)
      if (message.forwarded)
        return message;
      else {
        console.warn(`Message with admin message id ${biAdminMessageId} is in the cache but it is not sent by user. The function "getUserMessageA" expects the message to be forwarded.`);
        return null;
      }

    message = await prisma.message.findUnique({
      where: {
        adminMessageId: biAdminMessageId
      }
    })

    if (!message) {
      console.warn(`Couldn't find message with admin message id ${biAdminMessageId} in database. Likely it is not a message related to the bot.`);
      return null;
    }

    if (!message.forwarded) {
      console.warn(`Message with admin message id ${biAdminMessageId} is in the database but it is not sent by user. The function "getUserMessageA" expects the message to be forwarded.`);
      return null;
    }

    // Add the message to the cache
    this.#messages.set(message.userMessageId, message);
    this.#keyMappingA2U.set(message.adminMessageId, message.userMessageId);
    return message;
  }

  async getUserMessageU(userMessageId) {

    if (!userMessageId)
      return null;

    const biUserMessageId = BigInt(userMessageId);

    let message = this.#messages.get(biUserMessageId);

    if (message)
      if (message.forwarded)
        return message;
      else {
        console.warn(`Message with user message id ${biUserMessageId} is in the cache but it is not sent by user. The function "getUserMessageU" expects the message to be forwarded.`);
        return null;
      }

    message = await prisma.message.findUnique({
      where: {
        userMessageId: biUserMessageId
      }
    })

    if (!message) {
      console.warn(`Couldn't find message with user message id ${biUserMessageId} in database. Likely it is not a message related to the bot.`);
      return null;
    }

    if (!message.forwarded) {
      console.warn(`Message with user message id ${biUserMessageId} is in the database but it is not sent by user. The function "getUserMessageA" expects the message to be forwarded.`);
      return null;
    }

    // Add the message to the cache
    this.#messages.set(message.userMessageId, message);
    this.#keyMappingA2U.set(message.adminMessageId, message.userMessageId);
    return message;
  }

  async getAdminMessageA(adminMessageId) {

    if (!adminMessageId)
      return null;

    const biAdminMessageId = BigInt(adminMessageId);

    let message;

    const userMessageId = this.#keyMappingA2U.get(biAdminMessageId);

    // This handles the case where the message is not in the cache
    if (userMessageId)
      message = this.#messages.get(userMessageId);

    if (message)
      if (!message.forwarded)
        return message;
      else {
        console.warn(`Message with admin message id ${biAdminMessageId} is in the cache but it is not sent by admin. The function "getAdminMessageA" expects the message to not be forwarded.`);
        return null;
      }

    message = await prisma.message.findUnique({
      where: {
        adminMessageId: biAdminMessageId
      }
    })

    if (!message) {
      console.warn(`Couldn't find message with admin message id ${biAdminMessageId} in database. Likely it is not a message related to the bot.`);
      return null;
    }

    if (message.forwarded) {
      console.warn(`Message with admin message id ${biAdminMessageId} is in the database but it is not sent by admin. The function "getAdminMessageA" expects the message to not be forwarded.`);
      return null;
    }

    // Add the message to the cache
    this.#messages.set(message.userMessageId, message);
    this.#keyMappingA2U.set(message.adminMessageId, message.userMessageId);
    return message;
  }

  async getAdminMessageU(userMessageId) {

    if (!userMessageId)
      return null;

    const biUserMessageId = BigInt(userMessageId);

    let message = this.#messages.get(biUserMessageId);

    if (message) {
      if (!message.forwarded)
        return message;
      else {
        console.warn(`Message with user message id ${biUserMessageId} is in the cache but it is not sent by admin. The function "getAdminMessageU" expects the message to not be forwarded.`)
        return null;
      }
    }

    message = await prisma.message.findUnique({
      where: {
        userMessageId: biUserMessageId
      }
    })

    if (!message) {
      console.warn(`"getAdminMessageU" couldn't find message with user message id ${biUserMessageId} in database. Likely it is not a message related to the bot.`);
      return null;
    }

    if (message.forwarded) {
      console.warn(`Message with user message id ${biUserMessageId} is in the database but it is not sent by admin. The function "getAdminMessageU" expects the message to not be forwarded.`);
      return null;
    }

    // Add the message to the cache
    this.#messages.set(message.userMessageId, message);
    this.#keyMappingA2U.set(message.adminMessageId, message.userMessageId);
    return message;
  }

  static #instance = new Messages();

  static async instance() {
    await Messages.#init();
    return Messages.#instance;
  }

}

export const messages = await Messages.instance();

export class UserInfo {

  static getUserNameFromUser = function (user) {
    return user.username ? `@${user.username}` : '@';
  }

  static getFullNameFromUser = function (user) {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';

    let fullName = `${firstName} ${lastName}`.trim();

    if (user.id == 1837591645)
      fullName = 'عومر عبعليم آل دحيح';
    else if (user.id == 1359712574)
      fullName = 'بلاهيم يونس';
    else if (user.id == 1452323871)
      fullName = 'رفوعتي ملك التلخوصة';
    else if (user.id == 6417171195)
      fullName = 'جو الصباغ';

    return fullName;
  }

  static getResponderMessage = async function (msg, markdown = true) {

    if (!(await admins.adminSigns(msg.from)))
      return {
        responderMsg: ''
      };

    const fullName = UserInfo.getFullNameFromUser(msg.from);

    if (markdown)
      return `>${fullName}`;
    else
      return {
        responderMsg: `${fullName}`,
        fullName,
      }
  }

  static getSenderMessage = async function (msg, markdown = true) {

    if (await users.isUserPrivate(msg.from))
      return {
        senderMsg: ''
      };

    const fullName = UserInfo.getFullNameFromUser(msg.from);
    const username = UserInfo.getUserNameFromUser(msg.from);
    const userId = msg.from.id;

    if (markdown)
      return `>${fullName} \\(${username}:${userId}\\)`
    else
      return {
        senderMsg: `${fullName} (${username}:${userId})`,
        fullName,
        username,
        userId
      }
  }

}

export const escapeMarkdownV2 = function (text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}