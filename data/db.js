// const { MongoClient } = require('mongodb');
// const { ObjectId } = require('mongodb');
// const url = "mongodb://localhost:27017";
// const dbName = 'WEB209-FE2';

// async function connectDb() {
//     const client = new MongoClient(url);
//     await client.connect();
//     console.log('Kết nối thành công đến server');
//     return client.db(dbName);
// }
// module.exports = connectDb;
// config/db.js
const mongoose = require('mongoose');

const connectDb = async () => {
    try {
        const conn = await mongoose.connect('mongodb://localhost:27017/WEB209-FE2', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Kết nối thành công đến MongoDB');
        return conn;
    } catch (error) {
        console.error('Kết nối MongoDB thất bại:', error.message);
        process.exit(1);
    }
};

module.exports = connectDb;
