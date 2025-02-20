import { prisma } from './constants.js';
import QuickLRU from 'quick-lru';

class Settings {
  #replies;
  #forwardMode;
  #language;
  #initialized;

  constructor() {
    this.#replies = null;
    this.#forwardMode = null;
    this.#language = null;
    this.#initialized = null;
    this.testConnection();
  }

  async testConnection() {
    try {
      await prisma.$connect();
      console.log('Connection to database successful!');
    } catch (error) {
      console.error('Error connecting to the database:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  // REPLIES
  // repliedToMessagesAreShown
  static #repliesAreShownDB = async function () {
    const obj = await prisma.setting.findUnique({
      where: {
        key: 'replies',
      },
    });

    return obj.value == 'true' ? true : false;
  };

  static #showRepliesDB = async function () {
    await prisma.setting.update({
      where: {
        key: 'replies',
      },
      data: {
        value: 'true',
      },
    });
  };

  static #hideRepliesDB = async function () {
    await prisma.setting.update({
      where: {
        key: 'replies',
      },
      data: {
        value: 'false',
      },
    });
  };

  // FORWARDING
  static #forwardModeDB = async function () {
    const obj = await prisma.setting.findUnique({
      where: {
        key: 'forwardMode',
      },
    });

    return obj.value == 'true' ? true : false;
  };

  static #enableForwardModeDB = async function () {
    await prisma.setting.update({
      where: {
        key: 'forwardMode',
      },
      data: {
        value: 'true',
      },
    });
  };

  static #disableForwardModeDB = async function () {
    await prisma.setting.update({
      where: {
        key: 'forwardMode',
      },
      data: {
        value: 'false',
      },
    });
  };

  // LANGUAGE
  static #setArabicLanguageDB = async function () {
    await prisma.setting.update({
      where: {
        key: 'language',
      },
      data: {
        value: 'ar',
      },
    });
  };

  static #setEnglishLanguageDB = async function () {
    await prisma.setting.update({
      where: {
        key: 'language',
      },
      data: {
        value: 'en',
      },
    });
  };

  static #languageDB = async function () {
    const obj = await prisma.setting.findUnique({
      where: {
        key: 'language',
      },
    });

    return obj.value;
  };

  // INITIALIZED
  static #initializedDB = async function () {
    const obj = await prisma.setting.findUnique({
      where: {
        key: 'initialized',
      },
    });

    return obj.value;
  };

  static async init() {
    if (Settings.#instance.#initialized) return;

    const settingsPromiseArr = await Promise.allSettled([
      Settings.#repliesAreShownDB(),
      Settings.#forwardModeDB(),
      Settings.#languageDB(),
      Settings.#initializedDB(),
    ]);

    Settings.#instance.#replies = settingsPromiseArr[0].value;
    Settings.#instance.#forwardMode = settingsPromiseArr[1].value;
    Settings.#instance.#language = settingsPromiseArr[2].value;
    Settings.#instance.#initialized = settingsPromiseArr[3].value;

    if (Settings.#instance.#initialized == false) {
      await prisma.setting.update({
        where: {
          key: 'initialized',
        },
        data: {
          value: true,
        },
      });
      settings.#initialized = true;
    }
  }

  replies() {
    return this.#replies;
  }

  async setReplies(shown = true) {
    if (shown) {
      this.#replies = true;
      await Settings.#showRepliesDB();
    } else {
      this.#replies = false;
      await Settings.#hideRepliesDB();
    }
  }

  forwardMode() {
    return this.#forwardMode;
  }

  async setForwardMode(set = true) {
    if (set) {
      this.#forwardMode = true;
      await Settings.#enableForwardModeDB();
    } else {
      this.#forwardMode = false;
      await Settings.#disableForwardModeDB();
    }
  }

  language() {
    return this.#language;
  }

  async setLanguage(lang) {
    if (lang == 'ar') {
      this.#language = 'ar';
      await Settings.#setArabicLanguageDB();
    } else {
      this.#language = 'en';
      await Settings.#setEnglishLanguageDB();
    }
  }

  initialized() {
    return this.#initialized;
  }

  static #instance = new Settings();

  static async instance() {
    await Settings.init();
    return Settings.#instance;
  }
}

// USER ----------------------------------

class Users {
  #users = new QuickLRU({ maxSize: 500 });
  #bannedUserIds = new Set();
  constructor() {}

  static #getBannedChatIdsDB = async function () {
    const chats = await prisma.user.findMany({
      where: {
        banned: true,
      },
      select: {
        userId: true,
      },
    });

    return new Set(chats.map(chat => chat.userId));
  };

  static #addUserDB = async function (
    user,
    { banned = false, privateMode = false },
  ) {
    const sUserId = BigInt(user.id);

    console.log(user);

    return await prisma.user.create({
      data: {
        userId: sUserId,
        banned,
        private: privateMode,
      },
    });
  };

  static #deleteUserDB = async function (user) {
    const sUserId = BigInt(user.id);

    return await prisma.user.delete({
      where: {
        userId: sUserId,
      },
    });
  };

  static #getUserDB = async function (userId) {
    const sUserId = BigInt(userId);

    const user = await prisma.user.findUnique({
      where: {
        userId: sUserId,
      },
    });

    return user ? user : null;
  };

  static async init() {
    Users.#instance.#bannedUserIds = await Users.#getBannedChatIdsDB();
  }

  async getUser(userId) {
    const biUserId = BigInt(userId);

    let user = this.#users.get(biUserId);

    if (user) return user;

    user = await Users.#getUserDB(biUserId);

    if (user) this.#users.set(user.userId, user);

    return user;
  }

  async setUser(user, { banned, privateMode }) {
    const userId = BigInt(user.id);

    // If both are not specified
    if (banned == undefined && privateMode == undefined) return null;

    let userObj = await this.getUser(userId);

    if (!userObj)
      // The ternary operator handles the case where banned and private are undefined
      return await this.addUser(
        { userId },
        { banned: banned ? true : false, private: privateMode ? true : false },
      );

    let bannedChanged = false;
    let privateChanged = false;

    if (banned != undefined)
      if (userObj.banned != banned) {
        userObj.banned = banned;
        bannedChanged = true;
      }

    if (privateMode != undefined)
      if (userObj.private != privateMode) {
        userObj.private = privateMode;
        privateChanged = true;
      }

    if (!(bannedChanged || privateChanged)) return userObj;

    prisma.user
      .update({
        where: {
          userId,
        },
        data: {
          banned,
          private: privateMode,
        },
      })
      .then(u => {
        console.log('Updated user in database.', user);
      });

    return userObj;
  }

  // Adds the user immediately and then sends a request to the database
  async addUser(user, { banned = false, privateMode = false }) {
    const userObj = {
      userId: user.id,
      banned: banned ? banned : false,
      private: privateMode ? privateMode : false,
    };
    this.#users.set(userObj.userId, userObj);

    Users.#addUserDB(user, { banned, private: privateMode }).then(u => {
      userObj.id = u.id;
      console.log('Added a new user to database.', user);
    });

    return userObj;
  }

  // BANNING
  async isUserBanned(user) {
    const userId = BigInt(user.id);

    return this.#bannedUserIds.has(userId);
  }

  getBannedUserIds() {
    return this.#bannedUserIds;
  }

  async banUser(user) {
    const userId = BigInt(user.id);

    let userObj = await this.getUser(userId);

    if (!userObj) {
      userObj = await this.addUser(user, { banned: true });
      this.#bannedUserIds.add(userId);
      console.log('User was not found. Added a new user (in a banned state).');
    }

    if (userObj.banned) return true;

    await this.setUser(user, { banned: true });
    this.#bannedUserIds.add(userId);
    return true;
  }

  async unbanUser(user) {
    const userId = BigInt(user.id);

    let userObj = await this.getUser(userId);

    if (!userObj) {
      userObj = await this.addUser(user, { banned: false });
      this.#bannedUserIds.delete(userId);
      console.log(
        'User was not found. Added a new user (in a non-banned state).',
      );
    }

    if (!userObj.banned) return true;

    await this.setUser(user, { banned: false });
    this.#bannedUserIds.delete(userId);
    return true;
  }

  // PRIVATE
  async isUserPrivate(user) {
    const userId = BigInt(user.id);

    const userObj = await this.getUser(userId);
    return !userObj ? false : userObj.private;
  }

  async makeUserPrivate(user) {
    const userId = BigInt(user.id);

    let userObj = await this.getUser(userId);

    if (!userObj) {
      userObj = await this.addUser(user, { privateMode: true });
      console.log('User was not found. Added a new user (in a private state).');
    }

    if (userObj.private) return true;

    await this.setUser(user, { privateMode: true });
    return true;
  }

  async makeUserNonPrivate(user) {
    const userId = BigInt(user.id);

    let userObj = await this.getUser(userId);

    if (!userObj) {
      userObj = await this.addUser(user, { privateMode: false });
      console.log(
        'User was not found. Added a new user (in a non-private state).',
      );
    }

    if (!userObj.private) return true;

    await this.setUser(user, { privateMode: false });
    return true;
  }

  // ACTIVE CHANNEL
  async getActiveChannel(user) {
    const userObj = await this.getUser(user.id);

    const id = userObj?.activeChannelId;
  }

  static #instance = new Users();

  static async instance() {
    await Users.init();
    return this.#instance;
  }
}

// ADMIN ---------------------------------

class Admins {
  #admins = new QuickLRU({ maxSize: 30 });
  constructor() {}

  static #addAdminDB = async function (admin) {
    const sUserId = BigInt(admin.id);

    console.log(admin);

    return await prisma.admin.create({
      data: {
        userId: sUserId,
        signs: true,
      },
    });
  };

  static #getAdminDB = async function (userId) {
    const sUserId = BigInt(userId);

    const user = await prisma.admin.findUnique({
      where: {
        userId: sUserId,
      },
    });

    return user ? user : null;
  };

  async getAdmin(userId) {
    const biUserId = BigInt(userId);

    const user = this.#admins.get(biUserId);

    if (user) return user;

    const userObj = await Admins.#getAdminDB(biUserId);

    if (userObj) this.#admins.set(userObj.userId, userObj);

    return userObj; // Even if it is null
  }

  async setAdmin(user, { signs }) {
    const userId = BigInt(user.id);

    // If signing is not specified
    if (signs == undefined) return null;

    let userObj = await this.getAdmin(userId);

    if (!userObj)
      // The ternary operator handles the case where banned and private are undefined
      return await this.addAdmin({ userId }, { signs: signs ? true : false });

    let signsChanged = false;

    if (signs != undefined)
      if (userObj.signs != signs) {
        userObj.signs = signs;
        signsChanged = true;
      }

    if (!signsChanged) return userObj;

    await prisma.admin.update({
      where: {
        userId,
      },
      data: {
        signs,
      },
    });

    return userObj;
  }

  async addAdmin(user, { signs }) {
    const userObj = await Admins.#addAdminDB(user, { signs });
    this.#admins.set(userObj.userId, userObj);

    return userObj;
  }

  // SIGNING
  async adminSigns(user) {
    const userId = BigInt(user.id);

    const userObj = await this.getAdmin(userId);
    return !userObj ? true : userObj.signs;
  }

  async enableSigning(user) {
    const userId = BigInt(user.id);

    let userObj = await this.getAdmin(userId);

    if (!userObj) {
      userObj = await this.addAdmin(user, { signs: true });
      console.log('Admin was just added after calling /sign on.');
    }

    if (userObj.signs) return true;

    await this.setAdmin(user, { signs: true });
    return true;
  }

  async disableSigning(user) {
    const userId = BigInt(user.id);

    let userObj = await this.getAdmin(userId);

    if (!userObj) {
      userObj = await this.addAdmin(user, { signs: false });
      console.log('Admin was just added after calling /sign off.');
    }

    if (!userObj.signs) return true;

    await this.setAdmin(user, { signs: false });
    return true;
  }

  static #instance = new Admins();

  static async instance() {
    return this.#instance;
  }
}

export const settings = await Settings.instance();
export const users = await Users.instance();
export const admins = await Admins.instance();
