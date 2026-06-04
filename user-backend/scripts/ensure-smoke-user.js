'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const models = require('../models');

const SMOKE_USER_EMAIL = process.env.SMOKE_USER_EMAIL || 'healthcheck@cppeurope.net';
const SMOKE_USER_PASSWORD = process.env.SMOKE_USER_PASSWORD || 'healthcheck2026';
const SMOKE_USER_IS_ADMIN = process.env.SMOKE_USER_IS_ADMIN === 'true';

async function ensureSmokeUser() {
  await models.sequelize.authenticate();

  const passwordHash = await bcrypt.hash(SMOKE_USER_PASSWORD, 5);

  let user = await models.User.findOne({ where: { email: SMOKE_USER_EMAIL } });

  if (!user) {
    user = await models.User.create({
      email: SMOKE_USER_EMAIL,
      password: passwordHash,
      bio: 'Provisioned smoke user',
      isAdmin: SMOKE_USER_IS_ADMIN,
    });
    console.log('Created smoke user:', SMOKE_USER_EMAIL);
  } else {
    await user.update({
      password: passwordHash,
      isAdmin: SMOKE_USER_IS_ADMIN,
    });
    console.log('Updated smoke user:', SMOKE_USER_EMAIL);
  }

  const profile = await models.Profile.findOne({ where: { userId: user.id } });

  if (!profile) {
    await models.Profile.create({
      userId: user.id,
      email: user.email,
      lastName: null,
      firstName: null,
      phone1: null,
      phone2: null,
      phone3: null,
      address: null,
    });
    console.log('Created smoke profile:', SMOKE_USER_EMAIL);
  } else if (profile.email !== user.email) {
    await profile.update({ email: user.email });
    console.log('Updated smoke profile email:', SMOKE_USER_EMAIL);
  } else {
    console.log('Smoke profile already present:', SMOKE_USER_EMAIL);
  }
}

ensureSmokeUser()
  .then(async () => {
    await models.sequelize.close();
  })
  .catch(async (error) => {
    console.error('Failed to ensure smoke user:', error);
    try {
      await models.sequelize.close();
    } catch (closeError) {
      console.error('Failed to close sequelize:', closeError);
    }
    process.exit(1);
  });