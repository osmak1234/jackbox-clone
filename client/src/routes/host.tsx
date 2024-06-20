/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import useWebSocket from "react-use-websocket";
import {
  Player,
  GameModes,
  JobInterviewGameMode,
  JobInterviewAnswer,
  JobInterviewQuestion,
  JobInterviewGameStages,
} from "../types";

export default function Host() {
  const [roomCode, setRoomCode] = React.useState(
    Math.random().toString(36).substring(2, 6).toUpperCase(),
  );

  const [selected, setSelected] = React.useState("");
  const selectOptions = Object.values(GameModes);
  const [createdRoom, setCreatedRoom] = React.useState(false);
  const [players, setPlayers] = React.useState([] as Player[]);

  const [defaultRoundTime, setDefaultRoundTime] = React.useState(60);

  const [gameStarted, setGameStarted] = React.useState(false);

  const { sendJsonMessage } = useWebSocket(
    `ws://localhost:8080?roomCode=${roomCode}&name=HOST`,
    {
      onMessage: (event) => {
        console.log(event);
        const data = JSON.parse(event.data);

        switch (data.msg.request) {
          case "ROOM_CREATED":
            //TODO: handle if this message doesn't come
            console.log("room created");
            break;
          case "JOIN_ROOM":
            // use the data.from as the player name and push it to the players array
            console.log("join room");
            setPlayers((prev) => {
              const updatedPlayers = [
                ...prev,
                {
                  name: data.from,
                  score: 0,
                },
              ];
              sendJsonMessage({
                to: "PLAYERS",
                msg: {
                  type: "UPDATE_PLAYERS",
                  players: updatedPlayers,
                },
              });
              sendJsonMessage({
                to: "PLAYERS",
                msg: {
                  type: "ROOM_INFO",
                  roomCode: roomCode,
                  defualtRoundTime: defaultRoundTime,
                  gameMode: selected,
                },
              });
              return updatedPlayers;
            });
            break;
          case "PLAYER_LEFT":
            // remove the player from the players array
            console.log("player left");
            setPlayers((prev) => {
              return prev.filter((player) => player.name !== data.msg.name);
            });
            sendJsonMessage({
              to: "PLAYERS",
              msg: {
                type: "UPDATE_PLAYERS",
                players: players,
              },
            });
            break;
          case "PONG":
            console.log("Pong from: ", data.from);
            break;

          case "PROMPT_RESPONSE":
            // save the response inside the game state
            setGameState((prev) => {
              const newGameState = { ...prev };

              if (
                newGameState.stage === JobInterviewGameStages.CREATE_QUESTIONS
              ) {
                newGameState.questions.push({
                  from: data.from,
                  question: data.msg.response,
                });
              } else if (
                newGameState.stage ===
                JobInterviewGameStages.FIRST_ROUND_ANSWERS
              ) {
                newGameState.firstAnswers.push({
                  toQuestion: data.msg.toQuestion,
                  from: data.from,
                  answer: data.msg.response,
                });
              } else if (
                newGameState.stage ===
                JobInterviewGameStages.SECOND_ROUND_ANSWERS
              ) {
                newGameState.secondAnswers.push({
                  toQuestion: data.msg.toQuestion,
                  from: data.from,
                  answer: data.msg.response,
                });
              } else if (
                newGameState.stage === JobInterviewGameStages.FIRST_VOTE
              ) {
                // find the player who's answer is being voted on
                const player = newGameState.firstAnswers.find(
                  (answer) => answer.from === data.msg.toQuestion,
                );
                console.log(player);
              } else if (
                newGameState.stage === JobInterviewGameStages.SECOND_VOTE
              ) {
                // find the player who's answer is being voted on
                const player = newGameState.secondAnswers.find(
                  (answer) => answer.from === data.msg.toQuestion,
                );
                console.log(player);
              }

              return newGameState;
            });
            break;
          case "VOTE_RESPONSE":
            // based on the vote, increment the score of the player who's answer was voted for
            setGameState((prev) => {
              const newGameState = { ...prev };

              if (
                newGameState.stage === JobInterviewGameStages.FIRST_VOTE ||
                newGameState.stage === JobInterviewGameStages.SECOND_VOTE
              ) {
                const player = newGameState.firstAnswers.find(
                  (answer) => answer.answer === data.msg.response,
                );
                // player.score++;
                console.log(player);
              }

              return newGameState;
            });

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

  React.useEffect(() => {
    if (createdRoom) {
      console.log("sending message to self");
      sendJsonMessage({
        to: "HOST",
        msg: {
          request: "ROOM_CREATED",
        },
      });

      const interval = setInterval(() => {
        sendJsonMessage({
          to: "PLAYERS",
          msg: {
            type: "PING",
          },
        });
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [createdRoom, sendJsonMessage]);

  const [roundTime, setRoundTime] = React.useState(60);

  const [gameState, setGameState] = React.useState<JobInterviewGameMode>({
    job: "",
    players: players,
    questions: [],
    firstAnswers: [],
    secondAnswers: [],
    stage: JobInterviewGameStages.DISPLAY_JOB,
  });

  const roundTimeRef = React.useRef(roundTime);
  const gameStateRef = React.useRef(gameState);
  const currentlyViewingQuestion = React.useRef(0);
  React.useEffect(() => {
    roundTimeRef.current = roundTime;
  }, [roundTime]);

  React.useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const handleStartGame = () => {
    setGameStarted((prev) => !prev);
    sendJsonMessage({
      to: "PLAYERS",
      msg: {
        type: "GAME_STARTED",
      },
    });

    const timeInterval = setInterval(() => {
      setRoundTime((prev) => {
        const newTime = prev - 1;
        roundTimeRef.current = newTime;
        return newTime;
      });
    }, 1000);

    const interval = setInterval(() => {
      sendJsonMessage({
        to: "PLAYERS",
        msg: {
          type: "GAME_UPDATE",
          timer: roundTimeRef.current,
        },
      });
    }, 500);
    // send the correct prompt to the players to answer based on the game state
    const updatePlayers = setInterval(() => {
      // debug info
      console.log(gameStateRef);
      switch (gameStateRef.current.stage) {
        case JobInterviewGameStages.DISPLAY_JOB:
          // do nothing
          break;
        case JobInterviewGameStages.CREATE_QUESTIONS:
          // send the prompt to the players to answer
          console.log("sending prompt to players");
          // check if the question is already answered by the player
          players.forEach((player) => {
            if (
              !gameStateRef.current.questions.find(
                (question) => question.from === player.name,
              )
            ) {
              sendJsonMessage({
                to: player.name,
                msg: {
                  type: "PROMPT",
                  prompt: "Write a question for the interviewee",
                },
              });
            }
          });
          break;
        case JobInterviewGameStages.FIRST_ROUND_ANSWERS:
          // 1 question is for 2 players, so use half of the questions for the first round
          // now use the sendJsonMessage to send the question to the players to answer
          gameStateRef.current.questions.forEach((question, index) => {
            if (index % 2 === 0) {
              const first_player = players.find(
                (player) =>
                  !gameStateRef.current.firstAnswers.find(
                    (answer) => answer.from === player.name,
                  ),
              ) as Player;

              const second_player = players.find(
                (player) =>
                  !gameStateRef.current.firstAnswers.find(
                    (answer) => answer.from === player.name,
                  ) && player.name !== first_player.name,
              ) as Player;

              sendJsonMessage({
                // select a random player who didn't write the question
                to: first_player.name,
                msg: {
                  type: "PROMPT",
                  prompt: question.question,
                },
              });
              sendJsonMessage({
                to: second_player.name,
                msg: {
                  type: "PROMPT",
                  prompt: question.question,
                },
              });
            }
          });
          break;
        case JobInterviewGameStages.FIRST_VOTE:
          {
            if (
              currentlyViewingQuestion.current >
              gameStateRef.current.questions.length / 2
            ) {
              // if the currentlyViewingQuestion is 0, increment it and send the first vote prompt
              currentlyViewingQuestion.current++;
            }
            // based on currentlyViewingQuestion, send the question to the players to vote
            const question =
              gameStateRef.current.questions[currentlyViewingQuestion.current];

            const first_anwer = gameStateRef.current.firstAnswers.find(
              (answer) => answer.toQuestion === question.question,
            ) as JobInterviewAnswer;

            const second_answer = gameStateRef.current.firstAnswers.find(
              (answer) =>
                answer.toQuestion === question.question &&
                answer.from !== first_anwer.from,
            ) as JobInterviewAnswer;

            // send a vote prompt to the players, which includes 2 optoins, players 1 answer and player 2 answer
            sendJsonMessage({
              to: "PLAYERS",
              msg: {
                type: "VOTE",
                prompt: "Vote for the better answer to: " + question.question,
                options: [
                  {
                    answer: first_anwer.answer,
                    from: first_anwer.from,
                  },
                  {
                    answer: second_answer.answer,
                    from: second_answer.from,
                  },
                ],
              },
            });
          }
          break;

        case JobInterviewGameStages.SECOND_ROUND_ANSWERS:
          // 1 question is for 2 players, so use half of the questions for the first round

          // now use the sendJsonMessage to send the question to the players to answer
          break;
        case JobInterviewGameStages.SECOND_VOTE:
          break;
        case JobInterviewGameStages.DISPLAY_WINNER:
          break;
      }
    }, 90);

    const updateGameState = setInterval(() => {
      switch (gameStateRef.current.stage) {
        case JobInterviewGameStages.DISPLAY_JOB:
          // if the job field is empty, make a fetch request to get a random job to localhost:8080/prompt
          if (gameStateRef.current.job === "") {
            gameStateRef.current.job = "Loading...";
            console.log("fetching job");
            fetch("http://localhost:8080/prompt", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                // auth key from local storage
                authKey: localStorage.getItem("verificationKey"),
                prompt:
                  "Give me a max 4 word job title, be very specific, funny or weird.",
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                setGameState((prev) => {
                  console.log(data.response);
                  gameStateRef.current.job = data.response;
                  return {
                    ...prev,
                    job: data.response,
                  };
                });
              });
            console.log("job fetched: " + gameStateRef.current.job);
          }
          break;
        case JobInterviewGameStages.CREATE_QUESTIONS:
          // players need to submit a question, if some players haven't submitted a question and the timer is up, set it to copy pasta
          if (
            gameStateRef.current.questions.length == players.length ||
            roundTimeRef.current == 0
          ) {
            setGameState((prev) => {
              const newGameState = { ...prev };
              players.forEach((player) => {
                if (
                  !newGameState.questions.find(
                    (question) => question.from === player.name,
                  )
                ) {
                  newGameState.questions.push({
                    from: player.name,
                    question:
                      "I didn't answer, because I'm a naughty boy, and I want to be punished by an officer",
                  });
                }
              });
              // update the game state to the new stage
              newGameState.stage = JobInterviewGameStages.FIRST_ROUND_ANSWERS;

              gameStateRef.current = newGameState;

              return newGameState;
            });
          }

          break;
        case JobInterviewGameStages.FIRST_ROUND_ANSWERS:
          break;
        case JobInterviewGameStages.FIRST_VOTE:
          break;
        case JobInterviewGameStages.SECOND_ROUND_ANSWERS:
          break;
        case JobInterviewGameStages.SECOND_VOTE:
          break;
        case JobInterviewGameStages.DISPLAY_WINNER:
          break;
      }
    }, 90);

    return () => {
      clearInterval(timeInterval);
      clearInterval(interval);
      clearInterval(updatePlayers);
      clearInterval(updateGameState);
    };
  };

  const renderGameStageScreen = () => {
    switch (gameState.stage) {
      case JobInterviewGameStages.DISPLAY_JOB:
        return (
          <div>
            <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
              {gameState.job}
            </h1>
            <button
              className="btn btn-primary w-full mb-6"
              onClick={() => {
                setGameState((prev) => {
                  return {
                    ...prev,
                    stage: JobInterviewGameStages.CREATE_QUESTIONS,
                  };
                });
              }}
            >
              Next
            </button>
          </div>
        );
      case JobInterviewGameStages.CREATE_QUESTIONS:
        return (
          <div>
            <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
              Write questions for the interviewee to answer.
            </h1>
            <button
              className="btn btn-primary w-full mb-6"
              onClick={() => {
                setGameState((prev) => {
                  gameStateRef.current.stage =
                    JobInterviewGameStages.FIRST_ROUND_ANSWERS;
                  return {
                    ...prev,
                    stage: JobInterviewGameStages.FIRST_ROUND_ANSWERS,
                  };
                });
              }}
            >
              Next
            </button>
          </div>
        );
      case JobInterviewGameStages.FIRST_ROUND_ANSWERS:
        return (
          <div>
            <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
              Answer the question as if you were the interviewee.
            </h1>
            <button
              className="btn btn-primary w-full mb-6"
              onClick={() => {
                setGameState((prev) => {
                  gameStateRef.current.stage =
                    JobInterviewGameStages.FIRST_VOTE;
                  return {
                    ...prev,
                    stage: JobInterviewGameStages.FIRST_VOTE,
                  };
                });
              }}
            >
              Next
            </button>
          </div>
        );
      case JobInterviewGameStages.FIRST_VOTE:
        return (
          <div>
            <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
              Vote for the better answer.
            </h1>
            <button
              className="btn btn-primary w-full mb-6"
              onClick={() => {
                setGameState((prev) => {
                  gameStateRef.current.stage =
                    JobInterviewGameStages.SECOND_ROUND_ANSWERS;

                  return {
                    ...prev,
                    stage: JobInterviewGameStages.SECOND_ROUND_ANSWERS,
                  };
                });
              }}
            >
              Next
            </button>
          </div>
        );
      case JobInterviewGameStages.SECOND_ROUND_ANSWERS:
        return (
          <div>
            <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
              Answer the question as if you were the interviewer.
            </h1>
            <button
              className="btn btn-primary w-full mb-6"
              onClick={() => {
                setGameState((prev) => {
                  gameStateRef.current.stage =
                    JobInterviewGameStages.SECOND_VOTE;
                  return {
                    ...prev,
                    stage: JobInterviewGameStages.SECOND_VOTE,
                  };
                });
              }}
            >
              Next
            </button>
          </div>
        );
      case JobInterviewGameStages.SECOND_VOTE:
        return (
          <div>
            <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
              Vote for the better answer.
            </h1>
            <button
              className="btn btn-primary w-full mb-6"
              onClick={() => {
                setGameState((prev) => {
                  gameStateRef.current.stage =
                    JobInterviewGameStages.DISPLAY_WINNER;
                  return {
                    ...prev,
                    stage: JobInterviewGameStages.DISPLAY_WINNER,
                  };
                });
              }}
            >
              Next
            </button>
          </div>
        );
      case JobInterviewGameStages.DISPLAY_WINNER:
        return (
          <div>
            <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
              Display the winner.
            </h1>
            <button
              className="btn btn-primary w-full mb-6"
              onClick={() => {
                // refresh the page
                window.location.reload();
              }}
            >
              Return to creating a room
            </button>
          </div>
        );
    }
  };

  return (
    <>
      {createdRoom ? (
        <>
          {gameStarted ? (
            <div>{renderGameStageScreen()}</div>
          ) : (
            <div className="min-h-screen bg-gradient-to-r from-blue-400 to-green-300 flex flex-col items-center justify-center p-6">
              <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-md">
                <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
                  Room Created
                </h1>
                <p className="text-xl text-center mb-4">
                  Room code:{" "}
                  <span className="font-mono text-2xl">{roomCode}</span>
                </p>

                <button
                  className="btn btn-primary w-full mb-6"
                  onClick={handleStartGame}
                >
                  {gameStarted ? "End Game" : "Start Game"}
                </button>

                <h2 className="text-2xl font-semibold text-center mb-4 text-indigo-700">
                  Players
                </h2>
                <ul className="space-y-2">
                  {players.map((player, index) => (
                    <li
                      key={index}
                      className="bg-gray-100 p-4 rounded-lg shadow-sm flex justify-between items-center"
                    >
                      <span className="text-lg text-black">{player.name}</span>
                      <span className="font-bold text-lg">{player.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="hero min-h-screen bg-base-200">
          <div className="hero-content flex-col lg:flex-row-reverse">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl font-bold"></h1>
            </div>
            <div className="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
              <form className="card-body">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Room code</span>
                  </label>
                  <input
                    type="text"
                    placeholder="room code"
                    onChange={(e) => setRoomCode(e.target.value)}
                    value={roomCode}
                    className="input input-bordered"
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Name</span>
                  </label>
                  <select
                    className="select select-bordered"
                    onChange={(e) => setSelected(e.target.value)}
                    value={selected}
                  >
                    <option value="" disabled>
                      Select a game
                    </option>

                    {selectOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <label className="label">
                    <span className="label-text">
                      Auth key (doesn't work without it)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={
                      // on load fill the input with the value from local storage
                      localStorage.getItem("verificationKey") || "Auth key"
                    }
                    onChange={(e) => {
                      localStorage.setItem("verificationKey", e.target.value);
                    }}
                    className="input input-bordered"
                    required
                  />

                  <label className="label">
                    <p className="label-text-alt">
                      Already have a room code? Try{" "}
                      <a
                        href="/play"
                        className="label-text-alt link link-hover text-white"
                      >
                        joining a room.
                      </a>
                    </p>
                  </label>
                </div>
                <div className="form-control mt-6">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setCreatedRoom(true);
                    }}
                  >
                    Create a room
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
