const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const providerEl = document.getElementById("provider");
const modelEl = document.getElementById("model");

let messages = [{role:"system", content:"You are a helpful assistant."}];

function append(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + (role==="user" ? "user" : "assistant");
  div.textContent = (role=== 'user' ? "You: " : "Bot: ") + text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

sendBtn.onclick = async () => {
  const text = inputEl.value.trim();
  if (!text) return;
  append("user", text);
  messages.push({role:"user", content:text});
  inputEl.value = "";
  append("assistant", "Thinking...");
  try {
    const res = await fetch("/api/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        provider: providerEl.value,
        model: modelEl.value || undefined,
        messages
      })
    });
    const data = await res.json();
    // Remove "Thinking..." message
    const last = chatEl.querySelectorAll(".msg.assistant");
    if (last.length) {
      const node = last[last.length-1];
      if (node.textContent.startsWith("Bot: Thinking")) node.remove();
    }
    let botText = "";
    if (data.provider === "openai" && data.raw && data.raw.choices) {
      botText = data.raw.choices[0].message?.content || JSON.stringify(data.raw);
    } else if (data.provider === "custom") {
      // Try extract sensible text
      if (typeof data.raw === "string") botText = data.raw;
      else if (data.raw?.choices?.[0]?.text) botText = data.raw.choices[0].text;
      else botText = JSON.stringify(data.raw);
    } else if (data.error) {
      botText = "Error: " + data.error;
    } else {
      botText = JSON.stringify(data);
    }
    append("assistant", botText);
    messages.push({role:"assistant", content:botText});
  } catch (err) {
    append("assistant", "Request failed: " + err.message);
  }
};

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});
