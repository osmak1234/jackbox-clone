import { useState } from "react";

function App() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    // redirect to /play?roomCode=roomCode&name=name
    window.location.href = `/play?roomCode=${roomCode}&name=${name}`;
  };

  return (
    <>
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
                <input
                  type="text"
                  placeholder="name"
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                  className="input input-bordered mb-2"
                  required
                />
                <label className="label">
                  <p className="label-text-alt">
                    Don't have a room code? Try{" "}
                    <a
                      href="/host"
                      className="label-text-alt link link-hover text-white"
                    >
                      creating a room.
                    </a>
                  </p>
                </label>
              </div>
              <div className="form-control mt-6">
                <button className="btn btn-primary" onClick={handleJoin}>
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
