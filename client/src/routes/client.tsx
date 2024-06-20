/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import useWebSocket from "react-use-websocket";
import { Player, Vote } from "../types";

export default function Client() {
  const [inRoom, setInRoom] = React.useState(false);

  const [gameMode, setGameMode] = React.useState("");

  const [gameStarted, setGameStarted] = React.useState(false);
  const [players, setPlayers] = React.useState([] as Player[]);

  const [prompt, setPrompt] = React.useState("");
  const [vote, setVote] = React.useState("");
  const [voteOptions, setVoteOptions] = React.useState([] as Vote[]);
  const [timer, setTimer] = React.useState(0);
  const [response, setResponse] = React.useState("");
  const [waiting, setWaiting] = React.useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get("roomCode");
  const name = urlParams.get("name");

  const { sendJsonMessage } = useWebSocket(
    `ws://localhost:8080?roomCode=${roomCode}&name=${name}`,
    {
      onMessage: (event) => {
        console.log(event);
        const data = JSON.parse(event.data);

        switch (data.msg.type) {
          case "UPDATE_PLAYERS":
            setPlayers(data.msg.players);
            setInRoom(true);
            break;

          case "PING":
            sendJsonMessage({
              to: "HOST",
              msg: {
                type: "PONG",
              },
            });
            break;

          case "ROOM_INFO":
            setGameMode(data.msg.gameMode);
            break;

          case "GAME_STARTED":
            setGameStarted(true);
            break;

          case "GAME_UPDATE":
            setTimer(data.msg.timer);
            break;
          case "PROMPT":
            setPrompt(data.msg.prompt);
            break;
          case "VOTE":
            setVote(data.msg.type);
            setPrompt(data.msg.prompt);
            setVoteOptions(data.msg.options);
            break;
          default:
            break;
        }
      },
      onError: (event) => {
        console.error(event);
      },
      onClose: (event) => {
        console.error(event);
      },
    },
  );
  const hasJoinedRoom = React.useRef(false);

  const handleResponseSubmit = () => {
    sendJsonMessage({
      to: "HOST",
      msg: {
        type: "PROMPT_RESPONSE",
        response,
      },
    });
  };

  React.useEffect(() => {
    if (!hasJoinedRoom.current) {
      sendJsonMessage({
        to: "HOST",
        msg: {
          request: "JOIN_ROOM",
        },
      });
      hasJoinedRoom.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {inRoom ? (
        <div>
          {gameStarted ? (
            <div>
              {waiting ? (
                <h1>Waiting for the next round</h1>
              ) : (
                <div>
                  <h1>{timer}</h1>
                  <h1>{prompt}</h1>
                  {vote ? (
                    <div>
                      <h1>{vote}</h1>
                      {
                        // chose options to vote from
                      }
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        placeholder="Your response to the prompt"
                        onChange={(e) => setResponse(e.target.value)}
                        value={response}
                        className="input input-bordered"
                        required
                      />
                      <button
                        onClick={handleResponseSubmit}
                        className="btn btn-primary"
                      >
                        Submit
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Lobby screen
            <div>
              <h1>Wait for the game to start</h1>
              <p>Room code: {roomCode}</p>
              <p>Name: {name}</p>
              <p>Players:</p>
              {
                <ul>
                  {players.map((player, index) => (
                    <li key={index}>
                      {player.name}: {player.score}
                    </li>
                  ))}
                </ul>
              }
            </div>
          )}
        </div>
      ) : (
        // Joining screen, or when the roomcode is invalid
        <div>
          <h1>Joining ...</h1>
          <p>
            If you are waiting more then a few seconds, the room code is
            incorrect
          </p>
        </div>
      )}
    </div>
  );
}
