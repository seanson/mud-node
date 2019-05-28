import express from "express";
import http from "http";
import SocketIO from "socket.io";
import log from "loglevel";

import Client from "./client";
import servers from "../servers.json";

const app = express();
const server = http.Server(app);
const io = new SocketIO(server);
const port = 8080;

log.info("Servers loaded: ", servers);
const clients = {};

io.on("connection", socket => {
    const { token } = socket.handshake.query;
    const { host } = socket.handshake.headers;
    if (!token) {
        log.warn(`Invalid token request from: ${host}`);
        return;
    }
    log.info(`Connection from ${host}: ${token}`);

    if (clients[token]) {
        log.info("Reconnecting to existing session.");
        clients[token].setWebSocket(socket);
    } else {
        const client = new Client(token);
        client.setWebSocket(socket);
        clients[token] = client;
    }
    socket.emit("servers", servers);
    socket.on("connectServer", name => {
        const telnetServer = servers.find(obj => obj.name === name);
        log.debug(`connectServer: ${telnetServer.host} ${telnetServer.port}`);
        clients[token].connect(telnetServer.host, telnetServer.port);
    });
    socket.on("disconnectServer", name => {
        const telnetServer = servers.find(obj => obj.name === name);
        log.debug(`disconnectServer: ${telnetServer.host} ${telnetServer.port}`);
        clients[token].disconnect();
    });
});

server.listen(port, () => {
    log.info(`[INFO] Listening on *: ${port}`);
});
