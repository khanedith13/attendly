import { useEffect, useState } from "react";
import api from "./api/axios";

function App() {
  const [status, setStatus] = useState("loading"); // loading | connected | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/health")
      .then((response) => {
        setStatus("connected");
        setMessage(response.data.message);
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message);
      });
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Attendly</h1>
      {status === "loading" && <p>Checking API connection...</p>}
      {status === "connected" && <p>✅ {message}</p>}
      {status === "error" && <p>❌ Cannot reach API: {message}</p>}
    </main>
  );
}

export default App;
