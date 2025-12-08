// Simple Express server acting as a proxy to AI providers
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

app.post("/api/chat", async (req, res) => {
  try {
    const { provider, model, messages } = req.body;
    if (!provider || !messages) return res.status(400).json({error:"provider and messages required"});

    if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return res.status(500).json({error:"OPENAI_API_KEY not set on server"});
      const modelName = model || process.env.OPENAI_MODEL || "gpt-4o-mini";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          max_tokens: 800
        })
      });
      const data = await response.json();
      return res.json({provider:"openai", raw: data});
    } else if (provider === "custom") {
      // Forward to a custom provider URL. Useful for Ollama (local) or other APIs.
      const url = process.env.CUSTOM_PROVIDER_URL;
      if (!url) return res.status(500).json({error:"CUSTOM_PROVIDER_URL not set"});
      const key = process.env.CUSTOM_PROVIDER_KEY;
      const headers = {"Content-Type":"application/json"};
      if (key) headers["Authorization"] = `Bearer ${key}`;
      const forwardResp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({model, messages})
      });
      const forwarded = await forwardResp.text();
      // Try parse JSON, otherwise return raw text
      try {
        return res.json({provider:"custom", raw: JSON.parse(forwarded)});
      } catch(e){
        return res.json({provider:"custom", raw: forwarded});
      }
    } else {
      return res.status(400).json({error:"unsupported provider, use 'openai' or 'custom'"});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({error: String(err)});
  }
});

app.get("/", (req,res)=> {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, ()=> console.log(`Server running on http://localhost:${PORT}`));
