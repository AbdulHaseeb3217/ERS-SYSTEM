const mongoose = require("mongoose");




const connectDB = async () => {
mongoose.connect('mongodb://127.0.0.1:27017/TheLastHope')
.then(()=>console.log('mongoDB connected...'))
.catch((err)=>console.log('mongoDB error',err));
}


module.exports = connectDB;


