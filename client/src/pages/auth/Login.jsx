import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { IconLockOpen } from "@tabler/icons";
import usePageTitle from "hooks/usePageTitle";
import { redirectToQuant0Login } from "@utils/quant0";

export default function SignIn() {
  usePageTitle("Sign In");

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56, mb: 2 }}>
            <IconLockOpen size={32} />
          </Avatar>
          <Typography component="h1" variant="h5" fontWeight="bold">
            Welcome to the App
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 4, maxWidth: 360 }}>
            Authentication is secured exclusively through Quant0 SSO with OAuth 2.1 &amp; PKCE verification.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => redirectToQuant0Login()}
            sx={{
              py: 1.6,
              backgroundColor: "#0f172a",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "1rem",
              textTransform: "none",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              "&:hover": {
                backgroundColor: "#1e293b",
              },
            }}
          >
            Sign In with Quant0
          </Button>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="text"
              size="small"
              onClick={() => redirectToQuant0Login({ screenHint: "signup" })}
              sx={{ textTransform: "none" }}
            >
              Don't have an account? Sign up with Quant0
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
