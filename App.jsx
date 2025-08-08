import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Chatbot from "./components/Chatbot";
import Login from "./components/Login";
import Register from "./components/Register";

import logo from "./assets/images/mkk_logo.png";
import './index.css';

function App() {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("loading");
  const [chatList, setChatList] = useState([]);
  const [chatMessages, setChatMessages] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);

  useEffect(() => {
    console.log("Initial localStorage:", {
      userEmail: localStorage.getItem("userEmail"),
      chatList: localStorage.getItem(`${localStorage.getItem("userEmail")}-chatList`),
      chatMessages: localStorage.getItem(`${localStorage.getItem("userEmail")}-chatMessages`)
    });
  }, []);

  useEffect(() => {
    const initializeApp = () => {
      try {
        const savedEmail = localStorage.getItem("userEmail");
        console.log("Found saved email:", savedEmail);
        
        if (savedEmail && savedEmail.trim() !== "") {
          const chatListKey = `${savedEmail}-chatList`;
          const chatMessagesKey = `${savedEmail}-chatMessages`;
          
          const storedChatList = JSON.parse(localStorage.getItem(chatListKey) || "[]");
          const storedChatMessages = JSON.parse(localStorage.getItem(chatMessagesKey) || "{}");

          console.log("Loaded data:", { storedChatList, storedChatMessages });

          setUser(savedEmail);
          setChatList(storedChatList);
          setChatMessages(storedChatMessages);

          if (storedChatList.length > 0) {
            setActiveChatId(storedChatList[0].id);
          }
          setCurrentView("chat");
        } else {
          console.log("No saved email found, showing login");
          setCurrentView("login");
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setCurrentView("login");
      }
    };

    initializeApp();
  }, []); 

  useEffect(() => {
    if (user) {
      try {
        const chatListKey = `${user}-chatList`;
        localStorage.setItem(chatListKey, JSON.stringify(chatList));
        console.log("Saved chatList to localStorage");
      } catch (error) {
        console.error("Error saving chatList:", error);
      }
    }
  }, [chatList, user]);

  useEffect(() => {
    if (user) {
      try {
        const chatMessagesKey = `${user}-chatMessages`;
        localStorage.setItem(chatMessagesKey, JSON.stringify(chatMessages));
        console.log("Saved chatMessages to localStorage");
      } catch (error) {
        console.error("Error saving chatMessages:", error);
      }
    }
  }, [chatMessages, user]);

  const handleNewChat = () => {
    const newId = `chat_${Date.now()}`;
    const newChat = { id: newId, title: `Chat - ${new Date().toLocaleDateString()}` };
    setChatList([newChat, ...chatList]);
    setChatMessages({ ...chatMessages, [newId]: [] });
    setActiveChatId(newId);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
  };

  const handleAddMessage = (newMessage) => {
    setChatMessages((prev) => {
      const updatedMessages = prev[activeChatId]
        ? [...prev[activeChatId], newMessage]
        : [newMessage];
      return { ...prev, [activeChatId]: updatedMessages };
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    setUser(null);
    setChatList([]);
    setChatMessages({});
    setActiveChatId(null);
    setCurrentView("login");
  };

  const handleLogin = (email) => {
    localStorage.setItem("userEmail", email);
    setUser(email);

    const storedChatList = JSON.parse(localStorage.getItem(`${email}-chatList`) || "[]");
    const storedChatMessages = JSON.parse(localStorage.getItem(`${email}-chatMessages`) || "{}");

    setChatList(storedChatList);
    setChatMessages(storedChatMessages);

    if (storedChatList.length > 0) {
      setActiveChatId(storedChatList[0].id);
    } else {
      setActiveChatId(null);
    }

    setCurrentView("chat");
  };

  const handleRegisterSuccess = (email) => {
    handleLogin(email);
  };

  if (currentView === "loading") {
    return <div className="text-center mt-10">Yükleniyor...</div>;
  }

  if (currentView === "login") {
    return (
      <>
        <Login onLogin={handleLogin} />
        <p style={{ textAlign: "center", marginTop: 10 }}>
          Hesabınız yok mu?{" "}
          <button onClick={() => setCurrentView("register")}>Kayıt Ol</button>
        </p>
      </>
    );
  }

  if (currentView === "register") {
    return (
      <>
        <Register onRegisterSuccess={handleRegisterSuccess} />
        <p style={{ textAlign: "center", marginTop: 10 }}>
          Zaten hesabınız var mı?{" "}
          <button onClick={() => setCurrentView("login")}>Giriş Yap</button>
        </p>
      </>
    );
  }

  return (
    <div className="flex min-h-screen w-full max-w-7xl mx-auto">
      <Sidebar
        isOpen={isOpen}
        toggleSidebar={toggleSidebar}
        oldChats={chatList}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        user={user}
        onLogout={handleLogout}
      />

      <div
        className="flex flex-col flex-1 px-4 transition-all duration-300"
        style={{ marginLeft: isOpen ? 240 : 60 }}
      >
        <header className="sticky top-0 shrink-0 z-20 bg-white">
          <div className="flex flex-col h-full w-full gap-1 pt-4 pb-2">
            <a href="https://www.mkk.com.tr/">
              <img src={logo} className="w-60" alt="logo" />
            </a>
            <h1 className="font-urbanist text-[1.65rem] font-semibold">MKK API Chatbot</h1>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {activeChatId ? (
            <Chatbot
              user={user}
              activeChatId={activeChatId}
              messages={chatMessages[activeChatId] || []}
              onAddMessage={handleAddMessage}
            />
          ) : (
            <div className="text-center mt-10">
              Lütfen bir sohbet seçin veya yeni sohbet başlatın.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;