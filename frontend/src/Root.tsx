import { useEffect, useState } from "react";
import { getCurrentAdmin, logout, type Admin } from "./api/auth";
import { isCancel, setUnauthorizedHandler } from "./api/client";
import App from "./App";
import LoginPage from "./components/LoginPage";
import { LogoMark } from "./components/Logo";
import { useTheme } from "./hooks/useTheme";

type Auth = { status: "checking" } | { status: "signed-out"; notice?: string } | { status: "signed-in"; admin: Admin };

/** Decides between the sign-in page and the app, based on the session cookie. */
function Root() {
  const themeState = useTheme();
  const [auth, setAuth] = useState<Auth>({ status: "checking" });

  useEffect(() => {
    getCurrentAdmin()
      .then((admin) => setAuth({ status: "signed-in", admin }))
      .catch((err) => {
        if (isCancel(err)) return;
        const offline = !(err as { response?: unknown })?.response;
        setAuth({
          status: "signed-out",
          notice: offline ? "Can't reach the server right now. Is the backend running?" : undefined,
        });
      });

    setUnauthorizedHandler(() =>
      setAuth({ status: "signed-out", notice: "Your session has ended. Please sign in again." })
    );
    return () => setUnauthorizedHandler(null);
  }, []);

  const signOut = async () => {
    try {
      await logout();
    } finally {
      setAuth({ status: "signed-out", notice: "You've been signed out." });
    }
  };

  if (auth.status === "checking") {
    return (
      <div className="splash" aria-busy="true" aria-label="Loading">
        <LogoMark size={44} />
      </div>
    );
  }

  if (auth.status === "signed-out") {
    return <LoginPage notice={auth.notice} onSignedIn={(admin) => setAuth({ status: "signed-in", admin })} />;
  }

  return <App admin={auth.admin} onSignOut={signOut} themeState={themeState} />;
}

export default Root;
