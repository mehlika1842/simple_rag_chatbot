import React, { useState, useEffect } from "react"; 
import logo from "../assets/images/mkk_icon.png";

const Sidebar = ({
  isOpen,
  toggleSidebar,
  oldChats = [],  
  onNewChat,
  onSelectChat,
  activeChatId,
}) => {
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("user-chatList");
    localStorage.removeItem("user-chatMessages");
    window.location.reload();
  };

  useEffect(() => {
    if (oldChats && oldChats.length > 0) {
      localStorage.setItem("user-chatList", JSON.stringify(oldChats));
    }
  }, [oldChats]);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem("activeChatId", activeChatId);
    }
  }, [activeChatId]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: isOpen ? 240 : 60,
        backgroundColor: "#791428",
        color: "#ffffff",
        padding: "10px",
        boxSizing: "border-box",
        transition: "width 0.3s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      {/* ÜST: Logo ve Menü */}
      <div>
        {/* Logo ve Kapat/Aç */}
        <div
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          onClick={() => {
            if (!isOpen) toggleSidebar();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isOpen ? "space-between" : "center",
            position: "relative",
            cursor: "pointer",
          }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{
              width: 50,
              height: "auto",
              marginBottom: 10,
              marginTop: 10,
            }}
          />

          {!isOpen && isLogoHovered && (
            <div
              style={{
                position: "absolute",
                left: 60,
                backgroundColor: "#333",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 12,
                whiteSpace: "nowrap",
                zIndex: 1,
              }}
            >
              Aç
            </div>
          )}

          {isOpen && (
            <button
              onClick={toggleSidebar}
              style={{
                color: "black",
                fontSize: 30,
                cursor: "pointer",
                background: "none",
                border: "none",
                padding: 0,
                marginBottom: 10,
              }}
              title="Kapat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                width={28}
                height={28}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Menü */}
        <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
          <li
            onClick={onNewChat}
            style={{
              cursor: "pointer",
              padding: "8px",
              borderRadius: 4,
              backgroundColor: "transparent",
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifyContent: isOpen ? "flex-start" : "center",
              userSelect: "none",
            }}
            title="Yeni Sohbet"
          >
            <span role="img" aria-label="chat">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                style={{ width: 20, height: 20 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"
                />
              </svg>
            </span>
            {isOpen && "Yeni Sohbet"}
          </li>

          {/* Eski Sohbetler */}
          {isOpen && (
            <>
              <li style={{ fontWeight: "bold", margin: "10px 0 5px" }}>
                Eski Sohbetler
              </li>
              {oldChats.map((chat) => (
                <li
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  style={{
                    paddingLeft: 10,
                    marginBottom: 6,
                    fontSize: 14,
                    cursor: "pointer",
                    backgroundColor:
                      chat.id === activeChatId ? "#1abc9c" : "transparent",
                    borderRadius: 4,
                    userSelect: "none",
                  }}
                  title={chat.title}
                >
                  {chat.title}
                </li>
              ))}
            </>
          )}
        </ul>
      </div>

      {/* Logout Butonu */}
      <div style={{ paddingBottom: 10 }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "8px 12px",
            backgroundColor: "#791428",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 14,
          }}
          title="Çıkış Yap"
        >
          {isOpen ? "Çıkış Yap" : "Çıkış"}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
