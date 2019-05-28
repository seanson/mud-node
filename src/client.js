import net from "net";
import log from "loglevel";

import { TelnetSocket } from "telnet-stream";
import TELNET, { ppt } from "./telnet";

const GMCP_RE = /([A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)?) ?(.*)?/;

export default class Client {
    constructor(clientId) {
        this.id = clientId;
        this.ws = null;
        this.status = "close";
        this.buffer = [];
        this.negotiated = false;
        this.setupTelnet();
    }

    setupTelnet() {
        this.socket = new net.Socket();
        this.telnet = new TelnetSocket(this.socket);
        this.telnet.on("connect", () => this.onStatusChange("connect"));
        this.telnet.on("end", () => this.onStatusChange("end"));
        this.telnet.on("close", hadError => this.onStatusChange("close", { hadError }));
        this.telnet.on("data", data => this.onData(data));
        this.telnet.on("error", error => this.onStatusChange("error", { error: error.code }));
        this.telnet.on("will", option => this.onWill(option));
        this.telnet.on("wont", option => this.onWont(option));
        this.telnet.on("do", option => this.onDo(option));
        this.telnet.on("dont", option => this.onDont(option));
        this.telnet.on("sub", (option, data) => this.onSub(option, data));
    }

    connect(host, port) {
        if (this.telnet.connecting) {
            log.debug("Received connection request for connection in progress.");
            return;
        }
        this.setupTelnet();
        this.socket.connect(port, host);
        this.ws.emit("status", { status: "connecting" });
    }

    disconnect() {
        this.socket.end();
    }

    setWebSocket(socket) {
        this.ws = socket;
        this.ws.on("send", ({ message }) => this.sendMessage(message));
        this.ws.on("sendControl", ({ data }) => this.sendControl(data));
        this.ws.emit("status", { status: this.status, data: {} });
        this.ws.emit("backLog", this.buffer);
    }

    sendMessage(message) {
        if (this.telnet.destroyed) {
            log.warn("Trying to send message on destroyed socket.");
            return;
        }
        this.telnet.write(message);
    }

    sendIAC(data) {
        if (this.telnet.destroyed) {
            log.warn("Trying to send message on destroyed socket.");
            return;
        }
        const msg = [TELNET.IAC, ...data];
        log.debug("->", msg.map(cmd => ppt(cmd)));
        this.socket.write(Buffer.from(msg));
    }

    onStatusChange(status, data = {}) {
        log.debug("statusChange:", status, data);
        this.status = status;
        this.ws.emit("status", { status, data });
    }

    onData(message) {
        this.buffer = [...this.buffer, message.toString()];
        this.ws.emit("clientData", message.toString());
    }

    onWill(option) {
        log.debug ("<-", "IAC", "WILL", ppt(option));
        switch (option) {
            case TELNET.ECHO:
                this.ws.emit("echo", false);
                break;
            case TELNET.GMCP:
                this.sendIAC([TELNET.DO, TELNET.GMCP]);
                break;
            default:
                this.sendIAC([TELNET.WONT, option]);
                break;
        }
    }

    onWont(option) {
        log.debug("<-", "WONT", TELNET[option]);
        switch (option) {
            case TELNET.ECHO:
                this.ws.emit("echo", true);
                break;
            default:
                break;
        }
    }

    onDo(option) {
        log.debug("<-", "DO", ppt(option));
        switch (option) {
            case TELNET.GMCP:
                this.sendIAC([TELNET.WILL, option]);
                break;
            case TELNET.TERMINALTYPE:
            case TELNET.NEGOTIATEWINDOWSIZE:
            case TELNET.CHARSET:
            default:
                this.sendIAC([TELNET.WONT, option]);
                break;
        }
    }

    onDont(option) {
        log.debug("<-", "DONT", TELNET[option]);
        this.sendIAC([TELNET.WONT, option]);
    }

    onSub(option, data) {
        log.debug("<-", "SB", option, data.toString());
        if (option === TELNET.GMCP) {
            const [, command, commandData] = GMCP_RE.exec(data.toString());
            try {
                const jsonData = JSON.parse(commandData);
                this.ws.emit("GMCP", [command, jsonData]);
                log.debug("GMCP", command, jsonData);
            } catch (error) {
                log.error("Failed to parse JSON commandData", commandData, error);
            }
        }
    }
}
