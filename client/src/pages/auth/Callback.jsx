import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { exchangeQuant0Code, clearQuant0Token } from "@utils/quant0";
import useAuth from "hooks/useAuth";
import axios from "@utils/axios";

export default function Callback() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { setQuant0Session } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    async function completeAuth() {
      try {
        // Step 1: Exchange code with Quant0 for tokens
        const tokens = await exchangeQuant0Code();
        if (!tokens?.access_token) {
          throw new Error("No access token returned by authentication provider.");
        }

        // Step 2: Establish session with backend
        const res = await axios.post(
          "/api/auth/quant0-session",
          {
            id_token: tokens.id_token,
            email: tokens.profile?.email,
            name: tokens.profile?.name,
          },
          {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          }
        );

        const verifiedUser = res.data;

        // Step 3: Update AuthContext
        if (setQuant0Session) {
          setQuant0Session(tokens.access_token, verifiedUser);
        }

        const targetRole = verifiedUser.role === "admin" ? "/admin/profile" : "/user/profile";
        navigate(targetRole, { replace: true });
      } catch (err) {
        console.error("Quant0 authentication failed:", err);
        clearQuant0Token();
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Token verification failed. Access denied.";
        setError(msg);
      }
    }

    completeAuth();
  }, [navigate, setQuant0Session]);

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" color="error" gutterBottom fontWeight="bold">
            Authentication Error
          </Typography>
          <Alert severity="error" sx={{ my: 3, wordBreak: "break-word" }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/login")}
          >
            Back to Sign In
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 5, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Verifying Authentication...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Validating cryptographic credentials with Quant0...
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </Paper>
    </Container>
  );
}
