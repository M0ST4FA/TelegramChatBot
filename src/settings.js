const { prisma } = require("./constants");

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Connection to database successful!');
  } catch (error) {
    console.error('Error connecting to the database:', error);
  } finally {
    await prisma.$disconnect();
  }
}
testConnection();

// SIGNING
exports.adminSigns = async function (user) {
  const sUserId = user.id;

  const userObj = await prisma.admin.findUnique({
    where: {
      userId: sUserId
    },
    select: {
      signs: true
    }
  })

  return !userObj ? true : userObj.signs;
}

exports.doNotSignMessagesOfAdmin = async function (user) {
  const sUserId = user.id;

  await prisma.admin.upsert({
    where: {
      userId: sUserId
    },
    update: {
      signs: false
    },
    create: {
      userId: sUserId,
      signs: false
    }
  }
  )
}

exports.signMessagesOfAdmin = async function (user) {
  const sUserId = user.id;

  await prisma.admin.upsert({
    where: {
      userId: sUserId
    },
    update: {
      signs: true
    },
    create: {
      userId: sUserId,
      signs: true
    }
  }
  )
}

// REPLIES
// repliedToMessagesAreShown
const repliesAreShown = async function () {
  const obj = await prisma.setting.findUnique({
    where: {
      key: "replies"
    }
  })

  return obj.value == "true" ? true : false;
}

const showReplies = async function () {
  await prisma.setting.update({
    where: {
      key: "replies"
    },
    data: {
      value: "true"
    }
  })
}

const hideReplies = async function () {
  await prisma.setting.update({
    where: {
      key: "replies"
    },
    data: {
      value: "false"
    }
  })
}

// FORWARDING
const forwardMode = async function () {
  const obj = await prisma.setting.findUnique({
    where: {
      key: "forwardMode"
    }
  })

  return obj.value == "true" ? true : false;
}

const enableForwardMode = async function () {
  await prisma.setting.update({
    where: {
      key: "forwardMode"
    },
    data: {
      value: "true"
    }
  })
}

const disableForwardMode = async function () {
  await prisma.setting.update({
    where: {
      key: "forwardMode"
    },
    data: {
      value: "false"
    }
  })
}

// LANGUAGE
const setArabicLanguage = async function () {
  await prisma.setting.update({
    where: {
      key: "language"
    },
    data: {
      value: "ar"
    }
  })
}

const setEnglishLanguage = async function () {
  await prisma.setting.update({
    where: {
      key: "language"
    },
    data: {
      value: "en"
    }
  })
}

const language = async function () {
  const obj = await prisma.setting.findUnique({
    where: {
      key: "language"
    }
  })

  return obj.value;
}

// INITIALIZED
const initialized = async function () {
  const obj = await prisma.setting.findUnique({
    where: {
      key: "initialized"
    }
  })

  return obj.value;
}

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
  }

  static async init() {

    const settingsPromiseArr = await Promise.allSettled([repliesAreShown(), forwardMode(), language(), initialized()]);

    let settings = new Settings();

    settings.#replies = settingsPromiseArr[0].value;
    settings.#forwardMode = settingsPromiseArr[1].value;
    settings.#language = settingsPromiseArr[2].value;
    settings.#initialized = settingsPromiseArr[3].value;

    if (settings.#initialized == false) {
      await prisma.setting.update({
        where: {
          key: "initialized"
        },
        data: {
          value: true
        }
      })
      this.#initialized = true;
    }

    Settings.#instance = settings;
  }

  replies() {
    return this.#replies;
  }

  setReplies(shown = true) {
    if (shown) {
      this.#replies = true;
      showReplies();
    } else {
      this.#replies = false;
      hideReplies();
    }
  }

  forwardMode() {
    return this.#forwardMode;
  }

  setForwardMode(set = true) {
    if (set) {
      this.#forwardMode = true;
      enableForwardMode();
    } else {
      this.#forwardMode = false;
      disableForwardMode();
    }
  }

  language() {
    return this.#language;
  }

  setLanguage(lang) {
    if (lang == "ar") {
      this.#language = "ar";
      setArabicLanguage();
    } else {
      this.#language = "en";
      setEnglishLanguage();
    }
  }

  initialized() {
    return this.#initialized;
  }

  static #instance = new Settings();

  static instance() {
    return Settings.#instance;
  };

}

// USER ----------------------------------

const getBannedChatIds = async function () {
  const chats = await prisma.user.findMany({
    where: {
      banned: true
    },
    select: {
      userId: true
    }
  })

  return chats.map(chat => chat.userId);
}

const addUser = async function (user, { banned = false, private = false }) {
  const sUserId = user.id;

  console.log(user);

  return await prisma.user.create({
    data: {
      userId: sUserId,
      banned,
      private
    }
  });
}
const getUser = async function (userId) {

  const sUserId = BigInt(userId)

  return await prisma.user.findUnique({
    where: {
      userId: sUserId
    }
  });
}

class Users {

  #users = new Map();
  constructor() {
  }

  async getUser(userId) {
    const user = this.#users.get(userId);

    if (user)
      return user;

    const userObj = await getUser(userId);

    if (userObj) {
      this.#users.set(userObj.userId, userObj);
      return userObj;
    } else
      return {};

  }

  async setUser(user, { banned, privateMode }) {

    const userId = user.id;

    // If both are not specified
    if (banned == undefined && privateMode == undefined)
      return {};

    let userObj = await this.getUser(userId);

    if (!userObj)
      // The ternary operator handles the case where banned and private are undefined
      return await this.addUser({ userId }, { banned: banned ? true : false, private: privateMode ? true : false });

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

    if (!(bannedChanged || privateChanged))
      return userObj;

    this.#users.set(userId, userObj);

    await prisma.user.update({
      where: {
        userId
      },
      data: {
        banned,
        private: privateMode
      }
    })

    return userObj;
  };

  // Adds the user immediately and then sends a request to the database
  async addUser(user, { banned = false, privateMode = false }) {
    const userObj = await addUser(user, { banned, private: privateMode });
    this.#users.set(userObj.userId, userObj);

    return userObj;
  }

  // BANNING
  async isUserBanned(user) {
    const userObj = await this.getUser(user.id);
    return Object.entries(userObj).length == 0 ? false : userObj.banned;
  }

  async getBannedUserIds() {
    return await getBannedChatIds();
  }

  async banUser(user) {
    const userId = user.id;

    const userObj = await this.getUser(userId);

    if (!userObj) {
      console.log('Trying to ban a non-existent user.');
      return false;
    }

    if (userObj.banned)
      return true;

    await this.setUser(user, { banned: true });
    return true;
  }

  async unbanUser(user) {
    const userId = user.id;

    const userObj = await this.getUser(userId);

    if (!userObj) {
      console.log('Trying to unban a non-existent user.');
      return false;
    }

    if (!userObj.banned)
      return true;

    await this.setUser(user, { banned: false });
    return true;
  }

  // PRIVATE
  async isUserPrivate(user) {
    const userObj = await this.getUser(user.id);
    return Object.entries(userObj).length == 0 ? false : userObj.private;
  }

  async makeUserPrivate(user) {
    const userId = user.id;

    const userObj = await this.getUser(userId);

    if (!userObj) {
      console.log('Trying to make private a non-existent user.');
      return false;
    }

    if (userObj.private)
      return true;

    await this.setUser(userId, { private: true });
    return true;
  }

  async makeUserNonPrivate(user) {
    const userId = user.id;

    const userObj = await this.getUser(userId);

    if (!userObj) {
      console.log('Trying to make non-private a non-existent user.');
      return false;
    }

    if (!userObj.private)
      return true;

    await this.setUser(userId, { private: false });
    return true;
  }

  static #instance = new Users();

  static instance() {
    return this.#instance;
  }

}

// ADMIN ---------------------------------

const addAdmin = async function (admin) {
  const sUserId = admin.id;

  return await prisma.admin.create({
    data: {
      userId: sUserId,
      signs: true
    }
  });
}

const getAdmin = async function (userId) {
  const sUserId = BigInt(userId)

  return await prisma.admin.findUnique({
    where: {
      userId: sUserId
    }
  });
}

class Admins {

  #admins = new Map();
  constructor() {
  }

  async getAdmin(userId) {
    const user = this.#admins.get(userId);

    if (user)
      return user;

    const userObj = await getAdmin(userId);

    if (userObj) {
      this.#admins.set(userObj.userId, userObj);
      return userObj;
    } else
      return {};

  }

  async setAdmin(user, { signs }) {

    const userId = user.id;

    // If both are not specified
    if (signs == undefined)
      return {};

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

    if (!signsChanged)
      return userObj;

    this.#admins.set(userId, userObj);

    await prisma.admin.update({
      where: {
        userId
      },
      data: {
        signs
      }
    })

    return userObj;
  };

  async addAdmin(user, { signs }) {
    const userObj = await addAdmin(user, { signs });
    this.#admins.set(userObj.userId, userObj);

    return userObj;
  }

  // SIGNING
  async adminSigns(user) {
    const userObj = await this.getAdmin(user.id);
    return Object.entries(userObj).length == 0 ? true : userObj.signs;
  }

  async enableSigning(user) {
    const userId = user.id;

    const userObj = await this.getAdmin(userId);

    if (!userObj) {
      console.log('Trying to make sign a non-existent admin.');
      return false;
    }

    if (userObj.signs)
      return true;

    await this.setAdmin(userId, { signs: userObj.signs });
    return true;
  }

  async disableSigning(user) {
    const userId = user.id;

    const userObj = await this.getUser(userId);

    if (!userObj) {
      console.log('Trying to disable signing for a non-existent admin.');
      return false;
    }

    if (!userObj.signs)
      return true;

    await this.setAdmin(userId, { signs: userObj.signs });
    return true;
  }

  static #instance = new Admins();

  static instance() {
    return this.#instance;
  }
}

exports.settings = Settings.instance();
exports.users = Users.instance();
exports.admins = Admins.instance();

exports.initSettings = async function () {
  await Settings.init();
}