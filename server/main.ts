import * as http from "http";
import * as WebSocketServer from "ws";
import * as url from "url";
import * as uuid from "uuid";
import * as dotenv from "dotenv";

console.log("Starting server...");

const server = http.createServer();
const wsServer = new WebSocketServer.Server({ server });
dotenv.config();

const port = 8080;

const connections = {};
const users: {
  [uuid: string]: {
    name: string;
    roomCode: string;
  };
} = {};

const handleClose = (uuid: string) => {
  // send plater left message to user named "HOST" with the same room code
  const user = users[uuid];
  Object.keys(users).forEach((uuid) => {
    if (users[uuid].roomCode === user.roomCode && users[uuid].name === "HOST") {
      connections[uuid].send(
        JSON.stringify({
          msg: {
            request: "PLAYER_LEFT",
            name: user.name,
          },
        }),
      );
    }
  });

  delete connections[uuid];
  delete users[uuid];
};

wsServer.on("connection", (connection: WebSocket, request) => {
  if (!request.url) {
    console.log("No URL provided");
    connection.close();
    return;
  }

  const { roomCode, name } = url.parse(request.url, true).query;
  const con_uuid = uuid.v4();
  console.log(`New connection: ${con_uuid}`);
  console.log(`Room code: ${roomCode}`);
  console.log(`Name: ${name}`);

  connections[con_uuid] = connection;

  // if there is no room code or name, close the connection
  if (!roomCode || !name) {
    connection.close();
    return;
  }

  users[con_uuid] = {
    name: name as string,
    roomCode: roomCode as string,
  };

  // broadcast to all users with the same room code
  connection.onmessage = (message) => {
    const { data } = message;
    console.log(`Received message: ${data}`);

    const { to, msg: msg } = JSON.parse(data);
    const user = users[con_uuid];

    // if there is to: "HOST", send to only user named "HOST" with the same room code
    // if there is to: "PLAYERS", send to all users except user named "HOST" with the same room code

    if (to === "PING") {
      connection.send(
        JSON.stringify({
          msg: "PONG",
        }),
      );
    } else if (to === "HOST") {
      Object.keys(users).forEach((uuid) => {
        if (
          users[uuid].roomCode === user.roomCode &&
          users[uuid].name === "HOST"
        ) {
          connections[uuid].send(
            JSON.stringify({
              msg: msg,
              from: user.name,
            }),
          );
        }
      });
    } else if (to === "PLAYERS") {
      Object.keys(users).forEach((uuid) => {
        if (
          users[uuid].roomCode === user.roomCode &&
          users[uuid].name !== "HOST"
        ) {
          connections[uuid].send(
            JSON.stringify({
              msg: msg,
            }),
          );
        }
      });
    } else {
      // to a specific player
      Object.keys(users).forEach((uuid) => {
        if (users[uuid].name === to) {
          connections[uuid].send(
            JSON.stringify({
              msg: msg,
              from: user.name,
            }),
          );
        }
      });
    }
  };

  connection.onclose = () => {
    handleClose(con_uuid);
  };
});

server.on("request", (req, res) => {
  //             res.writeHead(200, { "Content-Type": "application/json" });
  //             res.end(
  //               JSON.stringify({ response: "monkey Boy" }),
  //             );
  //
  if (req.url === "/prompt" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      console.log(body);
      console.log(JSON.parse(body).authKey);
      console.log(process.env.AUTH_KEY);
      if (JSON.parse(body).authKey === process.env.AUTH_KEY) {
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are a game judge.",
              },
              {
                role: "user",
                content: JSON.parse(body).prompt,
              },
            ],
          }),
        })
          .then((apiResponse) => apiResponse.json())
          .then((apiData) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ response: apiData.choices[0].message.content }),
            );
          })
          .catch((error) => {
            console.error(error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
          });
      } else {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Forbidden" }));
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
