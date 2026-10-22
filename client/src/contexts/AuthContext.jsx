import LoadingScreen from "@components/LoadingScreen";
import { createContext, useEffect, useReducer, useRef } from "react";
import { axiosPrivate } from "../utils/axios";
import jwtDecoder from "jwt-decode";
import { catchError } from "../utils/catchError";
import {
  hasQuant0Session,
  getFreshQuant0Token,
  quant0SignOut,
  clearQuant0Token,
} from "../utils/quant0";

//initial State value
const initialState = {
  isInitialized: false,
  isAuthenticated: false,
  accessToken: "",
  user: null,
};

// create context
const AuthContext = createContext({ ...initialState });

// action types
const ActionTypes = {
  INIT: "INIT",
  LOGIN: "LOGIN",
  REFRESH: "REFRESH",
  LOGOUT: "LOGOUT",
};

// reducer
const reducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.INIT: {
      return {
        isInitialized: true,
        isAuthenticated: action.payload.isAuthenticated,
        accessToken: action.payload.accessToken,
        user: action.payload.user,
      };
    }
    case ActionTypes.LOGIN: {
      return {
        ...state,
        isAuthenticated: true,
        accessToken: action.payload.accessToken,
        user: action.payload.user,
      };
    }
    case ActionTypes.REFRESH: {
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        accessToken: action.payload.accessToken,
        user: action.payload.user,
      };
    }
    case ActionTypes.LOGOUT: {
      return {
        ...state,
        isAuthenticated: false,
        accessToken: "",
        user: null,
      };
    }
    default: {
      return state;
    }
  }
};

// decode jwt
const decodeJwt = (token) => {
  try {
    const { userName, role, userId, sub, name, email } = jwtDecoder(token);
    return {
      userName: userName || name || email?.split("@")[0] || sub,
      role: role || "user",
      userId: userId || sub,
    };
  } catch {
    return { userName: "User", role: "user", userId: "quant0" };
  }
};

// auth provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isMountedRef = useRef(false);

  // set session directly (e.g. from Quant0 Callback)
  const setQuant0Session = (accessToken, verifiedUser) => {
    const user = {
      userName: verifiedUser.userName || verifiedUser.name || "User",
      role: verifiedUser.role || "user",
      userId: verifiedUser._id || verifiedUser.id,
      email: verifiedUser.email,
    };

    dispatch({
      type: ActionTypes.LOGIN,
      payload: { accessToken, user },
    });
  };

  // login
  const login = async (userName, password) => {
    const response = await axiosPrivate.post("/api/auth/login", {
      userName,
      password,
    });

    const { accessToken } = response.data;
    const user = decodeJwt(accessToken);

    dispatch({ type: ActionTypes.LOGIN, payload: { accessToken, user } });
  };

  // change password
  const changePassword = async (oldPassword, newPassword) => {
    await axiosPrivate.post("/api/auth/change-password", {
      oldPassword,
      newPassword,
    });
  };

  // logout
  const logout = async () => {
    try {
      await axiosPrivate.get("/api/auth/logout");
    } catch (error) {
      console.log(error);
    } finally {
      clearQuant0Token();
      dispatch({ type: ActionTypes.LOGOUT });
      if (hasQuant0Session()) {
        quant0SignOut();
      }
    }
  };

  // refresh token
  const refresh = async () => {
    // 1. If user has Quant0 session stored in localStorage, refresh with Quant0
    if (hasQuant0Session()) {
      try {
        const freshQuant0Token = await getFreshQuant0Token();
        if (freshQuant0Token) {
          const res = await axiosPrivate.post(
            "/api/auth/quant0-session",
            {},
            {
              headers: { Authorization: `Bearer ${freshQuant0Token}` },
            }
          );
          const verifiedUser = res.data;
          const user = {
            userName: verifiedUser.userName || verifiedUser.name || "User",
            role: verifiedUser.role || "user",
            userId: verifiedUser._id || verifiedUser.id,
            email: verifiedUser.email,
          };

          dispatch({
            type: ActionTypes.REFRESH,
            payload: {
              accessToken: freshQuant0Token,
              user,
              isAuthenticated: true,
            },
          });

          return { accessToken: freshQuant0Token, user };
        }
      } catch (err) {
        console.warn("Quant0 token refresh failed:", err);
      }
    }

    // 2. Otherwise try local refresh cookie
    try {
      const response = await axiosPrivate.get("/api/auth/refresh");
      const { accessToken } = response.data;
      const user = decodeJwt(accessToken);

      dispatch({
        type: ActionTypes.REFRESH,
        payload: {
          accessToken,
          user,
          isAuthenticated: accessToken ? true : false,
        },
      });

      return { accessToken, user };
    } catch (error) {
      dispatch({
        type: ActionTypes.REFRESH,
        payload: { accessToken: "", user: null, isAuthenticated: false },
      });

      throw new Error(catchError(error));
    }
  };

  // init app
  const initializingApp = async () => {
    // Check Quant0 first if token is cached
    if (hasQuant0Session()) {
      try {
        const freshToken = await getFreshQuant0Token();
        if (freshToken) {
          const res = await axiosPrivate.post(
            "/api/auth/quant0-session",
            {},
            {
              headers: { Authorization: `Bearer ${freshToken}` },
            }
          );
          const verifiedUser = res.data;
          const user = {
            userName: verifiedUser.userName || verifiedUser.name || "User",
            role: verifiedUser.role || "user",
            userId: verifiedUser._id || verifiedUser.id,
            email: verifiedUser.email,
          };

          dispatch({
            type: ActionTypes.INIT,
            payload: {
              accessToken: freshToken,
              user,
              isAuthenticated: true,
            },
          });
          return;
        }
      } catch (e) {
        console.warn("Quant0 auto-init failed, falling back to local:", e);
      }
    }

    try {
      const { accessToken, user } = await refresh();

      dispatch({
        type: ActionTypes.INIT,
        payload: {
          accessToken,
          user,
          isAuthenticated: accessToken ? true : false,
        },
      });
    } catch (error) {
      dispatch({
        type: ActionTypes.INIT,
        payload: { accessToken: "", user: null, isAuthenticated: false },
      });
    }
  };

  useEffect(() => {
    if (isMountedRef.current) return;
    initializingApp();

    isMountedRef.current = true;
  }, []);

  // show loading if not init
  if (!state.isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refresh,
        changePassword,
        setQuant0Session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
