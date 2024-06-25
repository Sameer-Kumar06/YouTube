import dotenv from "dotenv";
dotenv.config(
    { path: './.env' 
    }
);

import connectDB from "./db/index.js";
connectDB(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})
.then()
.catch((err) => {
    console.log("MongoDB connection failed !!!", err);
})


