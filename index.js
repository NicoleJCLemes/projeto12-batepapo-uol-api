import express from "express";
import cors from 'cors';
import {MongoClient} from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from 'joi';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

setInterval( async () => {
    let time = Date.now();
    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12-batepapo-uol-api");
        const participantsDeleted = await db.collection("participants").deleteMany({lastStatus: {$lt: time - 10000}}).toArray();
        participantsDeleted.map(participant => {
            db.collection("messages").insertOne([{
                from: participant.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:mm:ss')
        }])});

        mongoClient.close();

    } catch (e) {
        mongoClient.close();
    }
}, 15000)

app.post("/participants", async (req, res) => {
    const body = req.body;
    let date = dayjs().format('HH:mm:ss');
    let isRepeated = null;

    const userSchema = joi.object({
        name: joi.string().required()
    });

    const validation = userSchema.validate(body)

    if(validation.error) {
        res.status(422).send(validation.error.details);
        return;  
    }

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12-batepapo-uol-api");

        isRepeated = await db.collection("participants").findOne({
            name: body.name
        });

        if (isRepeated === null) {
            await db.collection("participants").insertOne({...body, lastStatus: Date.now()});
            await db.collection("messages").insertOne({from: body.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: date})
            res.sendStatus(201);
        } else {
            res.sendStatus(409);
        }

        mongoClient.close();

    } catch (e) {
        res.status(500).send("Ocorreu um erro ao registrar seu nome!");
        mongoClient.close();
    }


});

app.get("/participants", async (req, res) => {

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12-batepapo-uol-api");

        const users = await db.collection("participants").find().toArray()
        res.send(users);
        mongoClient.close();
    } catch (e) {
        res.status(500).send("Ocorreu um erro ao obter os participantes!");
        mongoClient.close();
    }

});

app.post("/messages", async (req, res) => {
    const body = req.body;
    const from = req.headers.user;
    let participant;

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12-batepapo-uol-api");
        
        const messageSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().valid("message", "private_message").required(),
            from: joi.string().required()
        });
        
        const validation = messageSchema.validate({...body, from: from});
        
        if(validation.error) {
            res.status(422).send(validation.error.details);
            return;  
        }
        
        participant = await db.collection("participants").findOne({name: from}).toArray();
        
        if (!participant) {
            await db.collection("messages").insertOne({...body, from: from, time: dayjs().format('HH:mm:ss')});
            res.sendStatus(201);
        } else {
            res.sendStatus(422);
        }
        
        mongoClient.close();

    } catch (e) {
        res.status(500).send("Ocorreu um erro ao enviar sua mensagem!");
        mongoClient.close();
    }
});

app.get("/messages", async (req, res) => {

    const limit = parseInt(req.query.limit);
    const user = req.headers.user;

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12-batepapo-uol-api");

        const messages = await db.collection("messages").find({$or: [{type: "message"}, {type: "private_message", to: user}, {from: user}]}).toArray();

        res.send(messages)
        mongoClient.close();
    } catch (e) {
        res.status(500).send("Ocorreu um erro ao obter as mensagens!");
        mongoClient.close();
    }
});

app.post("/status", async (req, res) => {
    const user = req.headers.user;

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12-batepapo-uol-api");

        const participant = await db.collection("participants").findOne({name:user});
        if (!participant) {
            res.sendStatus(404);
            mongoClient.close();
            return;
        }

        await db.collection("participants").updateOne({name: user}, {
            $set: {
                lastStatus: Date.now()
            }
        });

        res.sendStatus(200);
        
    } catch (e) {
        res.status(500).send("Ocorreu um erro!");
        mongoClient.close();
    }
});

app.listen(5000, () => console.log("server is running on port 5000"))