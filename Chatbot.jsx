import React, { useState, useEffect } from "react";

const Chatbot = ({ user, activeChatId }) => {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [responseTime, setResponseTime] = useState(null);

  const OPENROUTER_API_KEY = "YOUR_OPENROUTER_API_KEY"; // Replace with your actual OpenRouter API key

  useEffect(() => {
    if (user && activeChatId) {
      try {
        const saved = localStorage.getItem(`${user}-${activeChatId}-messages`);
        if (saved) {
          setMessages(JSON.parse(saved));
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error("Mesajlar yüklenirken hata:", e);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [user, activeChatId]);

  useEffect(() => {
    if (user && activeChatId && messages.length >= 0) {
      try {
        localStorage.setItem(
          `${user}-${activeChatId}-messages`,
          JSON.stringify(messages)
        );
      } catch (e) {
        console.error("Mesajlar kaydedilirken hata:", e);
      }
    }
  }, [messages, user, activeChatId]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      alert("Lütfen bir prompt girin.");
      return;
    }

    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg = {
      id: Date.now(),
      text: trimmed,
      sender: "user",
      time: currentTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setError(null);
    setResponseTime(null);

    const cacheKey = `userPromptCache-${user}`;
    let cache = {};
    try {
      const storedCache = localStorage.getItem(cacheKey);
      if (storedCache) cache = JSON.parse(storedCache);
    } catch (e) {
      console.error("Cache okunamadı:", e);
    }

    if (cache[trimmed]) {
      const botMsg = {
        id: Date.now() + 1,
        text: cache[trimmed],
        sender: "bot",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botMsg]);
      return;
    }

    const start = performance.now();

    try {
      const openRouterMessages = [
        ...messages.map((msg) => ({
          role: msg.sender === "bot" ? "assistant" : "user",
          content: msg.text,
        })),
        { role: "user", content: trimmed },
      ];

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "MyChatbotApp",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
          messages: openRouterMessages,
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const end = performance.now();
      setResponseTime((end - start).toFixed(2));

      const botText = data?.choices?.[0]?.message?.content || "Cevap alınamadı.";
      const botMsg = {
        id: Date.now() + 1,
        text: botText,
        sender: "bot",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMsg]);

      cache[trimmed] = botText;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch (e) {
        console.error("Cache kaydedilemedi:", e);
      }

      if (!res.ok) {
        setError(data.error?.message || "Bilinmeyen hata.");
      }
    } catch (err) {
      console.error(err);
      const failMsg = {
        id: Date.now() + 2,
        text: "Sunucuya bağlanılamadı.",
        sender: "bot",
        time: currentTime,
      };

      setMessages((prev) => [...prev, failMsg]);
      setError("Sunucuya bağlanılamadı.");
    }
  };

  if (!user || !activeChatId) {
    return (
      <div className="p-4 text-center text-gray-500">
        Lütfen önce bir kullanıcı ve sohbet seçin.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4 max-w-full">
      <div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Sorunuzu buraya yazın..."
          className="w-full h-24 border border-gray-300 p-2 rounded resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          className="mt-2 px-4 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
        >
          Soruyu Gönder
        </button>
      </div>

      <div className="text-sm text-gray-600">
        {responseTime && <div>Yanıt süresi: {responseTime} ms</div>}
        {error && <div className="text-red-600 font-semibold">{error}</div>}
      </div>

      <div className="bg-white p-4 rounded shadow mt-4 space-y-2 max-h-[400px] overflow-y-auto border">
        {messages.length === 0 && (
          <div className="text-gray-400 text-center">Henüz mesaj yok.</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm whitespace-pre-wrap ${
              msg.sender === "bot" ? "text-blue-600" : "text-black"
            }`}
          >
            <strong>{msg.sender === "bot" ? "Asistan" : "Sen"}</strong> [
            {msg.time}]: {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Chatbot;
