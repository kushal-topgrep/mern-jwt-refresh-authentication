import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { IconUserPlus } from "@tabler/icons";
import usePageTitle from "hooks/usePageTitle";
import { redirectToQuant0Login } from "@utils/quant0";

export default function Signup() {
  usePageTitle("Create Account");

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
            <IconUserPlus size={32} />
          </Avatar>
          <Typography component="h1" variant="h5" fontWeight="bold">
            Create an Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 4, maxWidth: 360 }}>
            User registration and credentials are fully managed by Quant0 identity provider.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => redirectToQuant0Login({ screenHint: "signup" })}
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
            Register with Quant0
          </Button>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="text"
              size="small"
              onClick={() => redirectToQuant0Login()}
              sx={{ textTransform: "none" }}
            >
              Already have an account? Sign in with Quant0
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
