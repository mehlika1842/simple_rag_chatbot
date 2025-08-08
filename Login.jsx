import React, { useState } from "react";
import logo from "../assets/images/mkk_logo.png";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Kayıt başarısız.");
      }

      setIsRegistering(false);
      setError("Kayıt başarılı. Lütfen giriş yapın.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Giriş başarısız.");
      }

      localStorage.setItem("userEmail", email.trim());
      onLogin(email.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (isRegistering) {
        handleRegister();
      } else {
        handleLogin();
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>MKK API Chatbot</h2>
        <img src={logo} alt="logo" className="w-60" style={{ marginBottom: 20 }} />

        <input
          type="email"
          placeholder="E-posta adresi"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.input}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.input}
          disabled={loading}
        />

        {error && <p style={styles.error}>{error}</p>}

        {isRegistering ? (
          <>
            <button onClick={handleRegister} style={styles.button} disabled={loading}>
              {loading ? "Kayıt oluyor..." : "Kayıt Ol"}
            </button>
            <p style={styles.linkText}>
              Zaten bir hesabınız var mı?{" "}
              <span
                style={styles.link}
                onClick={() => {
                  setIsRegistering(false);
                  setError("");
                }}
              >
                Giriş Yap
              </span>
            </p>
          </>
        ) : (
          <>
            <button onClick={handleLogin} style={styles.button} disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Giriş"}
            </button>
            <p style={styles.linkText}>
              Hesabınız yok mu?{" "}
              <span
                style={styles.link}
                onClick={() => {
                  setIsRegistering(true);
                  setError("");
                }}
              >
                Kayıt Ol
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f0f2f5",
  },
  card: {
    padding: 30,
    borderRadius: 10,
    backgroundColor: "#fff",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    width: 320,
    textAlign: "center",
  },
  title: {
    marginBottom: 10,
    color: "#333",
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 12,
    border: "1px solid #ccc",
    borderRadius: 5,
    fontSize: 14,
  },
  button: {
    width: "100%",
    padding: 10,
    backgroundColor: "#88001b",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: 10,
  },
  error: {
    color: "red",
    fontSize: 13,
    marginBottom: 10,
  },
  linkText: {
    fontSize: 14,
    marginTop: 5,
  },
  link: {
    color: "#007bff",
    textDecoration: "underline",
    cursor: "pointer",
  },
};

export default Login;
