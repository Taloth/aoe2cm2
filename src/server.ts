import express from "express";
import {Server} from "http"
import socketio from "socket.io";
import Player from "./models/Player";
import {IDraftConfig} from "./models/IDraftConfig";
import {IJoinMessage} from "./models/IJoinMessage";
import {DraftsStore} from "./models/DraftsStore";
import {Validator} from "./models/Validator";
import {ValidationId} from "./models/ValidationId";
import PlayerEvent from "./models/PlayerEvent";
import {DraftEvent} from "./models/DraftEvent";
import {Util} from "./models/Util";

const app = express();
app.set("port", process.env.PORT || 3000);

const server = new Server(app);
const io = socketio(server, {cookie: false});
const draftsStore = new DraftsStore();
const validator = new Validator(draftsStore);

function setPlayerName(draftId: string, player: Player, name: string) {
    if (!draftsStore.has(draftId)) {
        draftsStore.initDraft(draftId);
    }
    draftsStore.setPlayerName(draftId, player, name);
}

function newDraftId(): string {

    const characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let id: string = '';
    for (let i = 0; i < 5; i++) {

        id += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return id;
}

app.use(/^\/$/, (req, res) => {
    console.log('redirecting');
    res.redirect('/draft/' + newDraftId());
});
app.use('/draft/[a-zA-Z]+', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static('build'));

io.on("connection", (socket: socketio.Socket) => {
    const draftId: string = socket.handshake.query.draftId;

    const roomHost: string = `${draftId}-host`;
    const roomGuest: string = `${draftId}-guest`;
    const roomSpec: string = `${draftId}-spec`;

    console.log("a user connected to the draft", draftId);

    if(!draftsStore.has(draftId)){
        draftsStore.initDraft(draftId);
    }

    const {nameHost, nameGuest} = draftsStore.getPlayerNames(draftId);

    const rooms = Object.keys(socket.adapter.rooms);
    console.log('rooms', rooms);
    if (!rooms.includes(roomHost)) {
        socket.join(roomHost);
        const message = {nameHost, nameGuest, youAre: Player.HOST};
        console.log('sending', message);
    } else if (!rooms.includes(roomGuest)) {
        socket.join(roomGuest);
        const message = {nameHost, nameGuest, youAre: Player.GUEST};
        console.log('sending', message);
    } else {
        socket.join(roomSpec);
        const message = {nameHost, nameGuest, youAre: Player.NONE};
        console.log('sending', message);
    }

    socket.on("join", (message: IJoinMessage, fn: (dc: IDraftConfig) => void) => {
        console.log("player joined:", message);
        let playerType: Player = Player.NONE;
        if (Object.keys(socket.rooms).includes(roomHost)) {
            setPlayerName(draftId, Player.HOST, message.name);
            draftsStore.setPlayerReady(draftId, Player.HOST);
            playerType = Player.HOST;
        } else if (Object.keys(socket.rooms).includes(roomGuest)) {
            setPlayerName(draftId, Player.GUEST, message.name);
            draftsStore.setPlayerReady(draftId, Player.GUEST);
            playerType = Player.GUEST
        }
        socket.nsp
            .in(roomHost)
            .in(roomGuest)
            .in(roomSpec)
            .emit("player_joined", {name: message.name, playerType});
        fn({
            ...draftsStore.getDraftOrThrow(draftId),
            yourPlayerType: playerType
        });
    });

    socket.on("act", (message: PlayerEvent, fn: (retval: any) => void) => {
        console.log(message);
        const validationErrors:ValidationId[] = validate(draftId, message);
        if (validationErrors.length === 0) {

            let hostMessage = message;
            let guestMessage = message;
            let specMessage = message;

            if (draftsStore.isLastActionHidden(draftId)) {
                const hiddenCivilisation = Util.getHiddenCivilisationForActionType(message.actionType);
                specMessage = new PlayerEvent(message.player, message.actionType, hiddenCivilisation);
                if (message.player === Player.HOST) {
                    guestMessage = specMessage;
                }
                if (message.player === Player.GUEST) {
                    hostMessage = specMessage;
                }
            }

            socket.nsp
                .in(roomHost)
                .emit("playerEvent", hostMessage);
            socket.nsp
                .in(roomGuest)
                .emit("playerEvent", guestMessage);
            socket.nsp
                .in(roomSpec)
                .emit("playerEvent", specMessage);
            fn({status:'ok', validationErrors});

            const expectedAction = draftsStore.getExpectedAction(draftId);
            if (expectedAction !== null) {
                if (expectedAction.player === Player.NONE) {
                    setTimeout(() => {
                        socket.nsp
                            .in(roomHost)
                            .in(roomGuest)
                            .in(roomSpec)
                            .emit("adminEvent", {...expectedAction, events: draftsStore.getEvents(draftId)});
                        draftsStore.addDraftEvent(draftId, expectedAction);
                    }, 2000);
                }
            }
        } else {
            fn({status:'error', validationErrors});
        }
    });
});

server.listen(3000, () => {
    console.log("listening on *:3000");
});

function validate(draftId: string, message: DraftEvent): ValidationId[] {
    return validator.validateAndApply(draftId, message);
}
