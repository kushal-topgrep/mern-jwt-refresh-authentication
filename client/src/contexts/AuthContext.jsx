import LoadingScreen from "@components/LoadingScreen";
import { createContext, useEffect, useReducer, useRef } from "react";
import { axiosPrivate } from "../utils/axios";
import {
  hasQuant0Session,
  getFreshQuant0Token,
  quant0SignOut,
  clearQuant0Token,
  redirectToQuant0Login,
} from "../utils/quant0";

// initial State
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

// auth provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isMountedRef = useRef(false);

  // set session directly (called from Quant0 Callback)
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

  // login redirects to Quant0 portal
  const login = () => {
    redirectToQuant0Login();
  };

  // logout terminates session and redirects via Quant0
  const logout = async () => {
    clearQuant0Token();
    dispatch({ type: ActionTypes.LOGOUT });
    quant0SignOut();
  };

  // refresh token via Quant0 OAuth 2.1 token endpoint
  const refresh = async () => {
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

    dispatch({
      type: ActionTypes.REFRESH,
      payload: { accessToken: "", user: null, isAuthenticated: false },
    });

    return { accessToken: "", user: null };
  };

  // init app on boot
  const initializingApp = async () => {
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
        console.warn("Quant0 session initialization failed:", e);
        clearQuant0Token();
      }
    }

    dispatch({
      type: ActionTypes.INIT,
      payload: { accessToken: "", user: null, isAuthenticated: false },
    });
  };

  useEffect(() => {
    if (isMountedRef.current) return;
    initializingApp();
    isMountedRef.current = true;
  }, []);

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
        setQuant0Session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
