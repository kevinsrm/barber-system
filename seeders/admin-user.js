import {sequelize, DataTypes} from "../db.js";
import {User} from "../app/models/user.js";
import bcrypt from "bcrypt";

const myPlaintextPassword = '12345678';
const saltRounds = 10;
bcrypt.hash(myPlaintextPassword, saltRounds, async function(err, hash) {
    const admin = await User.create({
  name: 'admin',
  email: 'admin@admin.com',
  password: hash,
  role: 'admin'
});
});
const users = await User.findAll();
console.log(users);
