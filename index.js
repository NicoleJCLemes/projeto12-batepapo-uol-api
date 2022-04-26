import express from "express";

const app = express();

app.post("/participants", (req, res) => {
    const body = req.body;
    res.statusCode(201);
});

app.get("/participants", (req, res) => {
    res.send(participants);
});

app.post("/messages", (req, res) => {
    const {to, text, type} = req.body;
    const user = req.headers.user;
    res.statusCode(201);
});

app.get("/messages", (req, res) => {
    res.send(messages);
});

app.post("/status", (req, res) => {
    const user = req.headers.user;
    res.statusCode(200);
});

app.listen(5000, () => console.log("server is running on port 5000"))