import { prisma, BotInfo } from './constants.js';
import { users, admins } from './settings.js'
import QuickLRU from 'quick-lru';

class Messages {

  static #onEvection(key, value) {
    this.#instance.#keyMappingA2U.delete(value.adminMessageId);
  }

  #messages = new QuickLRU({ maxSize: 10000, onEviction: Messages.#onEvection });
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

      // This handles the case where the message is not in the cache
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
      console.error("Couldn't find message.");
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
    let message;

    if (msg.chat.id == BotInfo.ADMIN_CHAT_ID)
      message = await this.getAdminMessageA(msg.message_id);
    else
      message = await this.getAdminMessageU(msg.message_id);

    return !message ? false : message.forwarded;
  }

  async getUserMessageA(adminMessageId) {

    if (!adminMessageId)
      return null;

    let message;

    const userMessageId = this.#keyMappingA2U.get(adminMessageId);

    if (userMessageId)
      message = this.#messages.get(userMessageId);

    if (message)
      if (message.forwarded)
        return message;
      else {
        console.error("Couldn't find user message.");
        return null;
      }

    message = await prisma.message.findUnique({
      where: {
        adminMessageId
      }
    })

    if (!message) {
      console.error("Couldn't find message.");
      return null;
    }

    if (!message.forwarded) {
      console.error("Couldn't find user message.");
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

    let message = this.#messages.get(userMessageId);

    if (message)
      if (message.forwarded)
        return message;
      else {
        console.error("Couldn't find user message.");
        return null;
      }

    message = await prisma.message.findUnique({
      where: {
        userMessageId
      }
    })

    if (!message) {
      console.error("Couldn't find message.");
      return null;
    }

    if (!message.forwarded) {
      console.error("Couldn't find user message.");
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

    let message;

    const userMessageId = this.#keyMappingA2U.get(adminMessageId);

    // This handles the case where the message is not in the cache
    if (userMessageId)
      message = this.#messages.get(userMessageId);

    if (message)
      if (!message.forwarded)
        return message;
      else {
        console.error("Couldn't find admin message.");
        return null;
      }

    message = await prisma.message.findUnique({
      where: {
        adminMessageId
      }
    })

    if (!message) {
      console.error("Couldn't find message.");
      return null;
    }

    if (message.forwarded) {
      console.error("Couldn't find admin message.");
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

    let message = this.#messages.get(userMessageId);

    if (message) {
      if (!message.forwarded)
        return message;
      else
        return null;
    }

    message = await prisma.message.findUnique({
      where: {
        userMessageId
      }
    })

    if (!message) {
      console.error("Couldn't find message.");
      return null;
    }

    if (message.forwarded) {
      console.error("Couldn't find admin message.");
      return null;
    }

    // Add the message to the cache
    this.#messages.set(message.userMessageId, message);
    this.#keyMappingA2U.set(message.adminMessageId, message.userMessageId);
    return message;
  }

  static #instance = new Messages;
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

    if (fullName == 'عمر عبدالعليم') {
      fullName = 'عومر عبعليم آل دحيح'
    }

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