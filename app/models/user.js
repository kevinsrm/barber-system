import {sequelize, DataTypes} from "../../db.js"





const User = sequelize.define("users", {
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    role: DataTypes.STRING
})
//User.sync()


export {User};