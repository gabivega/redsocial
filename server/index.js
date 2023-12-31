import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import { register } from "./controllers/auth.js"
import { createPost } from "./controllers/posts.js"
import { verifyToken } from "./middleware/auth.js";
import { createServer } from "http";
import { Server } from "socket.io";


// ===== CONFIGURATIONS =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin"}));
app.use(morgan("common"));
app.use(bodyParser.json( { limit: "30mb", extended : true }));
app.use(bodyParser.urlencoded( { limit: "30mb", extended: true }));
app.use(cors());
app.use("/assets", express.static(path.join(__dirname, "public/assets")));


// ===== FILE STORAGE =====
const storage = multer.diskStorage ({
    destination: function (req, file, cb) {
        cb(null, "public/assets");
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname);
        }
});
const upload = multer({ storage, limits:{fieldSize: 25 * 1024 * 1024}});

// ===== ROUTES WITH FILES ===== 

app.post("/auth/register", upload.single("picture"), register);
app.post("/posts",verifyToken, upload.single("picture"), createPost);
//app.post("/posts",verifyToken, createPost);

// ===== ROUTES ===== 
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);




// ===== MONGOOSE SETUP =====
const PORT = process.env.PORT || 6001;
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
// .then(() => {
//     app.listen(PORT, () => console.log(`Server Port: ${PORT}`));

    // ===== ADD DATA ONE TIME =====
   //User.insertMany(users);
   //Post.insertMany(posts);

// }).catch((error) => console.log(`${error} did not connect`));


// SOCKET.IO CONFIGURATIONS

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ["GET", "POST", "PATCH"]
  }
});

const prevMessages = []

io.on("connection", (socket) => {
    console.log(`se ha conectado el cliente ${socket.id}` )
    let usersConnected = io.engine.clientsCount
    console.log("usuarios conectados( on connection) " + usersConnected)
    io.emit("usersConnected", usersConnected)
    socket.emit("getPrevMessages", prevMessages)
    // socket.on("joinChat", (usuario)=>{

    //     console.log(`${usuario} se conecto a la sala`)

    // })
    socket.on("disconnect", (socket) => {
        let usersConnected = io.engine.clientsCount
        console.log(`se ha desconectado el cliente ${socket.id}`)
        io.emit("usersConnected", usersConnected)
        
        console.log("hay " + usersConnected + " usuarios conectados")
    } )
    socket.emit("getPrevMessages", (prevMessages))
    socket.on('chatMessage', (message) => {
        console.log(message)
        io.emit("broadcastMessages", (message))
        prevMessages.push(message)
        console.log(prevMessages)
        if(prevMessages.length >= 10) {
          prevMessages.shift()
        }
    })



  });

  httpServer.listen(PORT, ()=> {
    console.log(`SOCKET_IO Server Running on port ${PORT}`)
  });