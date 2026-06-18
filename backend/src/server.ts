import { app } from "./app.js";
import { env } from "./lib/env.js";

app.listen(env.PORT, "127.0.0.1", () => {
  console.log(`Easy_Resume API listening on http://127.0.0.1:${env.PORT}`);
});
